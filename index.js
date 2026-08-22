/**
 * toto-the-cat — host（Node）半边。
 *
 * 职责：
 *  - `/toto-the-cat/assets/*` 静态路由：把本包 `assets/` 目录下的图片
 *    资源（立绘 / 序列帧）喂给浏览器侧。
 *  - `/toto-the-cat/state` 状态路由（GET/POST）：托管番茄钟积累的经验值，
 *    持久化到 $DSH_HOME/toto-the-cat-state.json。状态放在 host 侧，浏览器
 *    只是读写方——这样 Chrome / Edge / 多标签页共享同一份进度（对比早期
 *    版本配置存 localStorage 导致各浏览器各存一份的教训）。
 *
 * 为什么需要自建路由：浏览器侧的 client.js 由 dsh-client-modules 提供，
 * 它只服务 `/plugins/<id>/client.js` 本身；包内静态资源与状态读写都必须由
 * host 半边显式注册 webServer 路由。路径放在 `/toto-the-cat/*` 顶层，
 * 避免与 `/plugins` 前缀路由的最长前缀匹配发生冲突。
 *
 * 为什么用 inject 而不是 ctx.get：webServer 由 dsh-host-webserver 行提供，
 * 该行要等 webStartup 就绪后才激活（fiber 状态才变为 active）。若在 apply
 * 里用 ctx.get('webServer')，插件挂载时服务可能还未激活，ctx.get 的严格
 * 状态检查（impl.fiber.state !== 2）会返回 undefined，路由就永远不会注册。
 * 声明 inject: ['webServer'] 后，cordis 会让本行进入等待，等服务可用时再
 * 激活——与 dsh-host-frontend-static 等真实包的做法完全一致。
 *
 * ── 后续扩展点（按需启用，别一次性全开）────────────────────────────
 *
 * 1) 监听宿主事件（事件名取自 dsh-base 系包的 emit 调用，示例）：
 *      ctx.on('agent/status', (payload) => { /* 把状态转发给浏览器侧 *\/ })
 *    其他可观察事件：subagent/start、subagent/end、goal/changed、
 *    tools/change、agent-preset/selected、theme/change（client 侧）。
 *
 * 2) 注册包私有 RPC（Client→Host 双向 JSON，见 cordis-plugin-development
 *    skill 中「Call Host from Client」一节）：
 *      harness.handle('toto/say', async (args) => ({ text: '喵' }))
 *    浏览器侧对应 host.call('toto/say', args)。注意 harness 是宿主 runner
 *    沙箱提供的内建符号，host 半边使用前请先用 cordis_inspect_list 核实
 *    当前运行时的真实签名，不要在未确认时直接裸用。
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'

export const name = 'toto-the-cat'
export const inject = ['webServer']

/** 本包 assets/ 目录的绝对路径（import.meta.url → 包内 index.js 所在目录）。 */
const ASSETS_DIR = fileURLToPath(new URL('./assets/', import.meta.url))

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8', // 事实文档（有关托托的30个事实.md）
}

// ---------- 状态持久化（经验值等进度数据） ----------
const STATE_DIR = process.env.DSH_HOME || join(homedir(), '.dsh')
const STATE_FILE = join(STATE_DIR, 'toto-the-cat-state.json')

async function readState() {
  try {
    const data = JSON.parse(await readFile(STATE_FILE, 'utf8'))
    const xp = Math.floor(Number(data?.xp))
    return { xp: Number.isFinite(xp) && xp > 0 ? xp : 0 }
  } catch {
    return { xp: 0 } // 文件不存在 / 损坏 —— 从零开始
  }
}

async function writeState(state) {
  const xp = Math.floor(Number(state?.xp))
  if (!Number.isFinite(xp) || xp < 0) throw new Error('invalid xp') // 非法值不写入，避免进度被破坏
  await mkdir(STATE_DIR, { recursive: true })
  const tmp = STATE_FILE + '.tmp'
  await writeFile(tmp, JSON.stringify({ xp }), 'utf8')
  await rename(tmp, STATE_FILE) // 原子替换，避免写一半损坏
}

function readJsonBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        reject(new Error('body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function sendJson(res, status, obj) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-cache' })
  res.end(JSON.stringify(obj))
}

export function apply(ctx) {
  const webServer = ctx.webServer // inject: ['webServer'] 声明后可直接访问，cordis 保证服务就绪后才激活本行

  // 静态资源路由。前缀取 /toto-the-cat/assets（而不是 /toto-the-cat）：
  // 请求路径形如 /toto-the-cat/assets/idle-0.png，切掉前缀后剩余部分直接
  // 相对 assets/ 目录定位，避免多拼一层目录。
  ctx.effect(() => webServer.register({
    kind: 'prefix',
    path: '/toto-the-cat/assets',
    handler: async (req, res) => {
      try {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          res.writeHead(405)
          res.end()
          return
        }
        const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname)
        const prefix = '/toto-the-cat/assets/'
        if (!pathname.startsWith(prefix)) {
          res.writeHead(404)
          res.end()
          return
        }
        const rel = pathname.slice(prefix.length)
        // 拒绝空路径与反斜杠（URL 只应使用 '/'，反斜杠是目录穿越的常见入口）。
        if (rel.length === 0 || rel.includes('\\')) {
          res.writeHead(404)
          res.end()
          return
        }
        const target = normalize(join(ASSETS_DIR, rel))
        if (target !== ASSETS_DIR && !target.startsWith(ASSETS_DIR)) {
          res.writeHead(403)
          res.end()
          return
        }
        const type = MIME[extname(target).toLowerCase()]
        if (type === undefined) {
          res.writeHead(404)
          res.end()
          return
        }
        const body = await readFile(target)
        res.writeHead(200, {
          'content-type': type,
          'cache-control': 'no-cache',
        })
        res.end(req.method === 'HEAD' ? undefined : body)
      } catch (err) {
        // 文件不存在（assets 目录为空）或读取失败 —— 404。
        res.writeHead(404)
        res.end()
      }
    },
  }))

  // 状态路由：GET 读进度，POST 存进度（浏览器侧番茄钟完成后调用）。
  ctx.effect(() => webServer.register({
    kind: 'exact',
    path: '/toto-the-cat/state',
    handler: async (req, res) => {
      try {
        if (req.method === 'GET' || req.method === 'HEAD') {
          const state = await readState()
          sendJson(res, 200, state)
          return
        }
        if (req.method === 'POST') {
          const body = await readJsonBody(req)
          const parsed = JSON.parse(body.toString('utf8') || '{}')
          if (parsed === null || typeof parsed !== 'object') throw new Error('invalid body')
          await writeState(parsed)
          sendJson(res, 200, await readState())
          return
        }
        res.writeHead(405)
        res.end()
      } catch (err) {
        // 非法请求体 / 写入失败 —— 400，客户端保留本地兜底。
        res.writeHead(400)
        res.end()
      }
    },
  }))
}
