/**
 * toto-the-cat — browser（浏览器）半边。
 *
 * 托托（Toto）：住在 DSH Web 界面 shell.overlay 覆盖层上的桌宠。
 * 形象完全来自包内 assets/ 目录的自定义图片（idle-0.png…序列帧或 idle.png
 * 静态立绘），经 host 半边 /toto-the-cat/assets 路由供给。
 *
 * 渲染规则：
 *  - 探测完成前不渲染任何东西；图片加载成功后才淡入；
 *  - 没有图片资源、或加载失败 → 完全不显示（无内置保底形象）。
 *
 * 功能：
 *  - 序列帧动画（默认约 4fps，设置页可调 120–400ms/帧）；尊重减少动态效果
 *  - 拖拽：按住托托随意拖动，位置持久化（localStorage）
 *  - 右上角 × 关闭；隐藏后右下角常驻「唤醒药丸」
 *  - 番茄闹钟：点击托托开/关文字入口，专注/休息计时，完成获得经验
 *    （1 XP/分钟）；30 分钟内可解锁前三级，6 小时专注可全内容解锁
 *  - 有关托托的 30 个事实：与番茄闹钟并列的独立入口，按等级逐条解锁
 *    （标题列表，点击展开内容；第 30 条与作者后记在 30 级解锁）；
 *    升级时提醒有新事实可查看
 *  - 进度数据（经验/等级）由 host 半边持久化（$DSH_HOME/…/state.json），
 *    跨浏览器共享；localStorage 仅作离线兜底
 *  - 设置页（设置 → 托托桌宠）：显示开关、大小、动画、速度、像素渲染
 *
 * 依赖注入：仅使用 timer（ctx.interval 驱动帧循环/番茄钟），其余能力一律
 * ctx.get() 取用并在缺失时优雅降级，符合 cordis-plugin-development 规范。
 */
if (typeof window !== 'undefined' && typeof window.__ModuleLoader__ !== 'undefined') {
  window.__ModuleLoader__.load({
    id: 'toto-the-cat',
    factory(require) {
      const React = require('react')

      // ---------- 常量 ----------
      const NS = 'toto-the-cat'
      const STORAGE_KEY = NS + ':config'
      const PROG_KEY = NS + ':prog' // 经验值 localStorage 兜底键
      const LOGICAL_W = 200 // 显示容器尺寸（4:5），图片以 contain 适配
      const LOGICAL_H = 250
      const ASSET_BASE = '/toto-the-cat/assets/'
      const STATE_URL = '/toto-the-cat/state'
      const FRAME_MS = 240 // 序列帧播放间隔默认值（约 4 fps；设置页可调 120–400ms）
      const MAX_FRAMES = 16 // 最多探测的序列帧数
      const XP_PER_MIN = 1 // 每专注 1 分钟获得 1 点经验
      const BREAK_MIN = 5 // 休息时段固定 5 分钟
      const WORK_CHOICES = [5, 10, 15, 30, 45, 60] // 固定档位（分钟）；另有 1–120 自定义

      // ---------- 国际化字典 ----------
      const zh = {
        settingsTitle: '托托桌宠',
        show: '显示托托',
        scale: '大小',
        animations: '动画',
        speed: '动画速度',
        slow: '慢',
        fast: '快',
        on: '开',
        off: '关',
        pixelated: '像素渲染',
        close: '关闭托托',
        restore: '托托在睡觉 Zzz… 点我唤醒',
        noAssets: '未检测到外观图片（assets/ 目录为空或未生效），托托不会显示。详见 README 的「自定义外观」章节。',
        hint: '点击托托可打开/收起番茄闹钟入口；等级与事实在面板里。',
        // 番茄钟与成长
        pomodoro: '番茄闹钟',
        focus: '专注',
        brk: '休息',
        idle: '待机',
        start: '开始',
        pause: '暂停',
        resume: '继续',
        reset: '重置',
        minute: '分钟',
        custom: '自定义',
        level: '等级',
        xp: '经验',
        next: '距离下一级',
        factsTitle: '有关托托的30个事实',
        factsProgress: '已解锁 {n}/30',
        afterwordTitle: '作者后记',
        afterwordHint: '30 级解锁',
        locked: '？？？',
        levelUp: '🎉 托托升到 {n} 级！',
        unlockFact: '新的事实解锁：',
        gained: '+{n} XP',
        breakDone: '休息结束，托托伸了个懒腰',
        running: '专注中',
        breaking: '休息中',
      }
      const en = {
        settingsTitle: 'Toto Pet',
        show: 'Show Toto',
        scale: 'Size',
        animations: 'Animations',
        speed: 'Anim speed',
        slow: 'Slow',
        fast: 'Fast',
        on: 'On',
        off: 'Off',
        pixelated: 'Pixel rendering',
        close: 'Close Toto',
        restore: 'Toto is sleeping… click to wake',
        noAssets: 'No appearance images found (assets/ is empty or not served) — Toto stays hidden. See the Custom appearance section of the README.',
        hint: 'Click Toto to open/close the pomodoro entry; levels and the codex live in the panel.',
        // Pomodoro & growth
        pomodoro: 'Pomodoro',
        focus: 'Focus',
        brk: 'Break',
        idle: 'Idle',
        start: 'Start',
        pause: 'Pause',
        resume: 'Resume',
        reset: 'Reset',
        minute: 'min',
        custom: 'Custom',
        level: 'Level',
        xp: 'XP',
        next: 'Next level',
        factsTitle: '30 Facts about Toto',
        factsProgress: 'Unlocked {n}/30',
        afterwordTitle: "Author's note",
        afterwordHint: 'Unlocks at level 30',
        locked: '???',
        levelUp: '🎉 Toto reached level {n}!',
        unlockFact: 'New fact unlocked: ',
        gained: '+{n} XP',
        breakDone: 'Break over — Toto stretched',
        running: 'Focusing',
        breaking: 'On break',
      }

      // ---------- 有关托托的 30 个事实 ----------
      // 正式内容从 assets/有关托托的30个事实.md 运行时加载并解析（改 md 刷新即生效）；
      // 以下占位符仅在文档缺失/解析失败时兜底（结构保持不变：title / content）。
      const FACTS_MD = '有关托托的30个事实.md'
      const AFTERWORD_TITLE = '作者后记'

      function buildFactsZh() {
        const list = []
        for (let i = 1; i <= 30; i++) {
          list.push({
            title: '托托的事实 ' + String(i).padStart(2, '0'),
            content: '（占位内容）这是关于托托的第 ' + i + ' 条事实的详细描述，等待正式文本替换。',
          })
        }
        return list
      }
      function buildFactsEn() {
        const list = []
        for (let i = 1; i <= 30; i++) {
          list.push({
            title: 'Toto Fact ' + String(i).padStart(2, '0'),
            content: '(placeholder) Detailed description of fact #' + i + ' about Toto — to be replaced.',
          })
        }
        return list
      }
      const FACTS_ZH = buildFactsZh()
      const FACTS_EN = buildFactsEn()

      // 解析 facts 文档：形如 "1. 标题: 内容" 的 30 行 + "## 作者后记" 段落。
      // 成功返回 { facts, afterword }；不满足 30 条完整事实则返回 null（走占位符）。
      function parseFactsDoc(text) {
        const facts = []
        let afterword = null
        const afterwordParts = []
        let inAfterword = false
        const lines = String(text).split(/\r?\n/)
        for (const raw of lines) {
          const line = raw.trim()
          if (!line) continue
          const m = /^(\d{1,2})\.\s+([^:：]+?)[:：]\s*(.+)$/.exec(line)
          if (m) {
            inAfterword = false
            facts[Number(m[1]) - 1] = { title: m[2].trim(), content: m[3].trim() }
            continue
          }
          if (/^#{1,4}\s*作者后记/.test(line)) {
            inAfterword = true
            continue
          }
          if (inAfterword) afterwordParts.push(line)
        }
        if (afterwordParts.length > 0) {
          afterword = { title: AFTERWORD_TITLE, content: afterwordParts.join('\n') }
        }
        const valid = facts.length >= 30 && facts.slice(0, 30).every((f) => f && f.title && f.content)
        return valid ? { facts: facts.slice(0, 30), afterword } : null
      }

      // ---------- 默认配置与工具函数 ----------
      const DEFAULTS = {
        visible: true,
        scale: 0.9, // 默认 0.9：显示容器约 180×225 px
        animations: true,
        pixelated: true, // 像素画用：最近邻缩放，任意缩放都保持锐利
        frameMs: 240, // 序列帧间隔（ms），120–400 可调
        workMin: 25, // 番茄闹钟专注时长（分钟），1–120
        x: null, // null = 尚未放置，渲染时取右下角默认位
        y: null,
      }

      const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

      function reducedMotionPref() {
        try {
          return window.matchMedia('(prefers-reduced-motion: reduce)').matches
        } catch (e) {
          return false
        }
      }

      // ---------- 等级与经验 ----------
      // 升级所需经验（从 level 级升到 level+1 级）：
      //   前 3 次升级（到 2/3/4 级）每级只要 10 点 —— 30 分钟内即可解锁前三级；
      //   之后每 5 级 +1：升到 L+1 级需 10 + ⌊(L-3)/5⌋ 点。
      // 累计经验：L2=10  L3=20  L4=30  L5=40  L9=81  L15=150  L30=350 …
      // 节奏：15 分钟专注得 15 XP → 2 个时段（30 分钟）到 4 级；350 XP 全解锁
      // ≈ 6 小时（15/30/45/60 分钟时段均为整 6 小时，25 分钟时段约 5h50m）。
      function xpNeed(level) {
        return level <= 3 ? 10 : 10 + Math.floor((level - 3) / 5)
      }

      function levelFloor(level) {
        let xp = 0
        for (let l = 1; l < level; l++) xp += xpNeed(l)
        return xp
      }

      function levelFromXp(xp) {
        let level = 1
        while (xp >= levelFloor(level + 1)) level++
        return level
      }

      function levelProgress(xp) {
        const level = levelFromXp(xp)
        const cur = levelFloor(level)
        const next = levelFloor(level + 1)
        return next > cur ? (xp - cur) / (next - cur) : 1
      }

      // 事实解锁：前 29 条在 L2..L30 逐级解锁（第 N 条在 L=N+1 级）；
      // 第 30 条（索引 29）与作者后记在 L30 一起解锁。
      function factIndexFor(level) {
        if (level < 2) return -1
        return Math.min(level - 2, 29)
      }

      function lastContentUnlocked(level) {
        return level >= 30
      }

      function fmtTime(ms) {
        const total = Math.max(0, Math.ceil(ms / 1000))
        const m = Math.floor(total / 60)
        const s = total % 60
        return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')
      }

      function fmt(n, t) {
        return String(t).replace('{n}', String(n))
      }

      // 事实/文案语言：跟随浏览器语言（zh → 中文，其余 → 英文）
      function isZhLocale() {
        try {
          return (navigator.language || '').toLowerCase().startsWith('zh')
        } catch (e) {
          return true
        }
      }

      // ---------- 外观资源探测 ----------
      // 依次探测 idle-0.png…idle-15.png（序列帧），命中任意一帧即视为
      // 动画资源；否则尝试单帧 idle.png；都没有则返回 null（不显示）。
      // 校验 content-type 必须是 image/*（防止 SPA fallback 返回的 200 HTML
      // 被当作图片帧）；找到帧后顺手预加载，避免首轮逐帧闪现。
      async function probeFrames() {
        const isImage = (r) => {
          const type = r.headers.get('content-type') || ''
          return type.startsWith('image/')
        }
        const frames = []
        for (let i = 0; i < MAX_FRAMES; i++) {
          const url = ASSET_BASE + 'idle-' + i + '.png'
          try {
            const r = await fetch(url, { method: 'HEAD' })
            if (!r.ok || !isImage(r)) break
            frames.push(url)
          } catch (e) {
            break
          }
        }
        let result = null
        if (frames.length > 0) {
          result = frames
        } else {
          try {
            const r = await fetch(ASSET_BASE + 'idle.png', { method: 'HEAD' })
            if (r.ok && isImage(r)) result = [ASSET_BASE + 'idle.png']
          } catch (e) {
            // ignore
          }
        }
        if (result !== null) {
          for (const url of result) {
            const im = new Image()
            im.src = url
          }
        }
        return result
      }

      // ---------- 配置 store（内存 + localStorage 持久化） ----------
      // 下划线开头的键（_assets/_prog）为运行时状态，不参与 localStorage 持久化。
      function createStore() {
        let config = { ...DEFAULTS }
        const listeners = new Set()
        const store = {
          get() { return config },
          set(next) {
            config = { ...config, ...next }
            for (const fn of listeners) fn(config)
          },
          subscribe(fn) {
            listeners.add(fn)
            return () => { listeners.delete(fn) }
          },
        }
        return store
      }

      function useStore(store) {
        const [value, setValue] = React.useState(store.get())
        React.useEffect(() => store.subscribe(setValue), [store])
        return value
      }

      // 未放置时的默认位置：右下角（留出边距）
      function defaultPos(cfg) {
        const w = LOGICAL_W * cfg.scale
        const h = LOGICAL_H * cfg.scale
        return {
          x: Math.max(4, window.innerWidth - w - 28),
          y: Math.max(4, window.innerHeight - h - 28),
        }
      }

      function resolvePos(cfg) {
        const w = LOGICAL_W * cfg.scale
        const h = LOGICAL_H * cfg.scale
        const base = (cfg.x === null || cfg.y === null) ? defaultPos(cfg) : cfg
        return {
          x: clamp(base.x, 4, Math.max(4, window.innerWidth - w - 4)),
          y: clamp(base.y, 4, Math.max(4, window.innerHeight - h - 4)),
        }
      }

      // ---------- 托托主体 ----------
      // sprite 状态来自共享配置的 _assets 字段（apply 里探测一次）：
      //   undefined = 探测中（不渲染）；null = 无资源（不渲染）；数组 = 帧 URL
      function TotoPet({ ctx, store, updateConfig, persist, saveProgress, t }) {
        // 所有 hooks 必须无条件执行，早退（隐藏/无资源）放在最后。
        const cfg = useStore(store)
        const sprite = cfg._assets
        const prog = cfg._prog || { xp: 0 }
        const [frameIdx, setFrameIdx] = React.useState(0)
        const [imgReady, setImgReady] = React.useState(false) // 首帧加载完成才显示
        const [imgError, setImgError] = React.useState(false) // 任一帧加载失败 → 不显示
        const petRef = React.useRef(null)
        const dragRef = React.useRef(null) // { sx, sy, ox, oy, moved }
        const scale = cfg.scale
        // 番茄闹钟状态（引擎常驻，入口挂在托托身上）
        const [pomoEntry, setPomoEntry] = React.useState(false) // 入口簇可见（点击托托切换）
        const [panelOpen, setPanelOpen] = React.useState(false) // 番茄闹钟面板
        const [factsOpen, setFactsOpen] = React.useState(false) // 托托事实面板
        const [factsExpanded, setFactsExpanded] = React.useState(-1) // 展开的事实索引（-1 = 全收起）
        const [closeVisible, setCloseVisible] = React.useState(false) // × 叉号：交互后显示，空闲隐藏
        const closeTimer = React.useRef(null)
        const [phase, setPhase] = React.useState('idle') // idle | work | break
        const workMin = Number(cfg.workMin) > 0 ? cfg.workMin : 25 // 专注时长（1–120，可持久化）
        const [numDraft, setNumDraft] = React.useState(String(workMin)) // 手动输入草稿（允许中间态）
        const [remaining, setRemaining] = React.useState(0)
        const [running, setRunning] = React.useState(false)
        const [toast, setToast] = React.useState(null)
        const endRef = React.useRef(0)
        const timerRef = React.useRef(null)
        const phaseRef = React.useRef('idle')
        const workMinRef = React.useRef(workMin)
        workMinRef.current = workMin
        const progRef = React.useRef(prog)
        progRef.current = prog
        const factsRef = React.useRef([]) // 事实数组（运行时从 md 加载；供引擎闭包读取）
        const afterwordRef = React.useRef(null)
        const toastTimer = React.useRef(null)

        // 设置专注时长：合法输入即时生效并持久化；非法/越界不提交
        const applyWorkMin = (raw) => {
          const n = Math.round(Number(raw))
          if (Number.isFinite(n) && n >= 1 && n <= 120) {
            updateConfig({ workMin: n })
          }
        }
        // 外部（预设按钮/重置）变更 workMin 时，同步输入框草稿
        React.useEffect(() => {
          setNumDraft(String(workMin))
        }, [workMin])
        const commitNumDraft = () => {
          const n = Math.round(Number(numDraft))
          if (Number.isFinite(n) && n >= 1 && n <= 120) {
            updateConfig({ workMin: n })
          } else {
            setNumDraft(String(workMin)) // 非法输入 → 回退显示当前值
          }
        }

        // 资源切换时重置帧与加载状态
        React.useEffect(() => {
          setFrameIdx(0)
          setImgReady(false)
          setImgError(false)
        }, [sprite])

        // 序列帧播放（尊重减少动态效果与页面可见性；间隔可在设置页调节）
        React.useEffect(() => {
          if (!Array.isArray(sprite) || sprite.length < 2) return
          if (!cfg.animations || reducedMotionPref()) return
          const frameMs = Number(cfg.frameMs) > 0 ? cfg.frameMs : FRAME_MS
          let timer = null
          const advance = () => setFrameIdx((i) => (i + 1) % sprite.length)
          const stop = () => {
            if (timer !== null) {
              timer()
              timer = null
            }
          }
          const start = () => {
            if (timer === null) timer = ctx.interval(advance, frameMs)
          }
          const onVisibility = () => {
            if (document.hidden) stop()
            else start()
          }
          document.addEventListener('visibilitychange', onVisibility)
          if (!document.hidden) start()
          return () => {
            document.removeEventListener('visibilitychange', onVisibility)
            stop()
          }
        }, [sprite, cfg.animations, cfg.frameMs, ctx])

        // ---------- 番茄闹钟引擎 ----------
        const stopTicker = () => {
          if (timerRef.current !== null) {
            timerRef.current()
            timerRef.current = null
          }
        }
        const startTicker = () => {
          if (timerRef.current !== null) return
          timerRef.current = ctx.interval(() => {
            const left = endRef.current - Date.now()
            if (left <= 0) {
              completePhase()
              return
            }
            setRemaining(left)
          }, 250)
        }
        const showToast = (text) => {
          setToast({ text, key: Date.now() })
          if (toastTimer.current !== null) clearTimeout(toastTimer.current)
          toastTimer.current = setTimeout(() => setToast(null), 8000)
        }
        const completePhase = () => {
          stopTicker()
          const ph = phaseRef.current
          if (ph === 'work') {
            // 完成一个专注时段 → 按分钟发经验
            const minutes = workMinRef.current
            const gained = minutes * XP_PER_MIN
            const oldLevel = levelFromXp(progRef.current.xp)
            const newXp = progRef.current.xp + gained
            saveProgress(newXp)
            const newLevel = levelFromXp(newXp)
            if (newLevel > oldLevel) {
              // 升级提醒：有新的托托事实可查看（第 30 级同时解锁第 30 条与作者后记）
              const idx = factIndexFor(newLevel)
              const facts = factsRef.current
              let fact = idx >= 0 ? facts[idx] : null
              let suffix = fact ? t('unlockFact') + '「' + fact.title + '」' : ''
              if (newLevel >= 30 && afterwordRef.current && fact) {
                suffix = t('unlockFact') + '「' + fact.title + '」与「' + afterwordRef.current.title + '」'
              }
              showToast(fmt(newLevel, t('levelUp')) + ' ' + suffix)
            } else {
              showToast(fmt(gained, t('gained')))
            }
            // 自动进入休息
            phaseRef.current = 'break'
            endRef.current = Date.now() + BREAK_MIN * 60000
            setPhase('break')
            setRemaining(BREAK_MIN * 60000)
            setRunning(true)
            startTicker()
          } else if (ph === 'break') {
            showToast(t('breakDone'))
            phaseRef.current = 'idle'
            setPhase('idle')
            setRunning(false)
            setRemaining(0)
          }
        }
        const startWork = () => {
          phaseRef.current = 'work'
          workMinRef.current = workMin
          endRef.current = Date.now() + workMin * 60000
          setPhase('work')
          setRemaining(workMin * 60000)
          setRunning(true)
          startTicker()
        }
        const pause = () => {
          stopTicker()
          setRunning(false)
        }
        const resume = () => {
          endRef.current = Date.now() + Math.max(0, remaining)
          setRunning(true)
          startTicker()
        }
        const reset = () => {
          stopTicker()
          phaseRef.current = 'idle'
          setPhase('idle')
          setRunning(false)
          setRemaining(0)
        }
        // 叉号可见性：交互（悬停/移动/按下）时出现，空闲 2.5 秒后隐藏
        const pokeClose = () => {
          setCloseVisible(true)
          if (closeTimer.current !== null) clearTimeout(closeTimer.current)
          closeTimer.current = setTimeout(() => setCloseVisible(false), 2500)
        }
        React.useEffect(() => () => {
          stopTicker()
          if (toastTimer.current !== null) clearTimeout(toastTimer.current)
          if (closeTimer.current !== null) clearTimeout(closeTimer.current)
        }, [])

        // 隐藏时早退：渲染常驻的唤醒药丸而不是空。
        if (!cfg.visible) {
          return React.createElement('div', {
            className: 'toto-restore',
            style: {
              position: 'fixed',
              right: 16,
              bottom: 16,
              pointerEvents: 'auto',
              zIndex: 2147483000,
            },
            role: 'button',
            'aria-label': t('restore'),
            onClick: () => updateConfig({ visible: true }),
          }, t('restore'))
        }

        // 没有资源 / 资源加载失败 / 仍在探测 → 不显示任何东西。
        if (!Array.isArray(sprite) || imgError) return null

        const pos = resolvePos(cfg)

        // 拖拽（猫不说话，点击没有台词——安静地陪着你）
        const onPointerDown = (e) => {
          e.preventDefault()
          pokeClose()
          const el = petRef.current
          if (el === null) return
          try { el.setPointerCapture(e.pointerId) } catch (err) { /* ignore */ }
          dragRef.current = {
            sx: e.clientX,
            sy: e.clientY,
            ox: pos.x,
            oy: pos.y,
            moved: 0,
          }
        }
        const onPointerMove = (e) => {
          pokeClose()
          const d = dragRef.current
          if (!d) return
          const dx = e.clientX - d.sx
          const dy = e.clientY - d.sy
          d.moved = Math.max(d.moved, Math.abs(dx) + Math.abs(dy))
          const w = LOGICAL_W * scale
          const h = LOGICAL_H * scale
          updateConfig({
            x: clamp(d.ox + dx, 4, Math.max(4, window.innerWidth - w - 4)),
            y: clamp(d.oy + dy, 4, Math.max(4, window.innerHeight - h - 4)),
          }, false)
        }
        const endDrag = (e) => {
          const d = dragRef.current
          if (!d) return
          dragRef.current = null
          try { e.currentTarget.releasePointerCapture(e.pointerId) } catch (err) { /* ignore */ }
          persist()
          // 点击托托：开/关入口簇（拖动超过阈值不算点击）
          if (d.moved < 6) {
            if (pomoEntry || panelOpen || factsOpen) {
              setPomoEntry(false)
              setPanelOpen(false)
              setFactsOpen(false)
            } else {
              setPomoEntry(true)
            }
          }
        }

        const w = Math.round(LOGICAL_W * scale)
        const h = Math.round(LOGICAL_H * scale)
        const src = sprite[frameIdx % sprite.length]
        // 展示值
        const level = levelFromXp(prog.xp)
        const progress = levelProgress(prog.xp)
        // 事实内容：运行时从 assets/…md 解析，缺省回退占位符（中文优先）
        const factsData = cfg._facts
        const facts = factsData && Array.isArray(factsData.facts)
          ? factsData.facts
          : (isZhLocale() ? FACTS_ZH : FACTS_EN)
        const afterword = factsData && factsData.afterword ? factsData.afterword : null
        factsRef.current = facts
        afterwordRef.current = afterword
        // 解锁进度：前 29 条在 L2..L30 逐级解锁；第 30 条与作者后记在 L30 一起解锁
        const factsUnlocked = level >= 2 ? Math.min(level - 1, 29) : 0
        const lastUnlocked = lastContentUnlocked(level)
        const totalFactsUnlocked = Math.min(30, factsUnlocked + (lastUnlocked ? 1 : 0))
        const phaseLabel = phase === 'work' ? t('running') : phase === 'break' ? t('breaking') : t('idle')
        const totalMs = phase === 'work' ? workMinRef.current * 60000 : phase === 'break' ? BREAK_MIN * 60000 : 0
        const timerElapsed = totalMs > 0 ? 1 - remaining / totalMs : 0
        // 入口/面板定位：永远出现在屏幕较空的一侧（比较托托上下方剩余空间）
        const entryText = running
          ? (phase === 'work' ? t('focus') : t('brk')) + ' ' + fmtTime(remaining)
          : t('pomodoro')
        const PANEL_W = 264
        const sideBelow = window.innerHeight - (pos.y + h) >= pos.y // 下方空间更大 → 面板在下方
        const entryClusterGap = 6
        const entryClusterH = 32
        const entryClusterBottom = sideBelow
          ? window.innerHeight - (pos.y + h + entryClusterGap)
          : window.innerHeight - (pos.y + entryClusterGap)
        const panelLeft = clamp(pos.x + w / 2 - PANEL_W / 2, 8, Math.max(8, window.innerWidth - PANEL_W - 8))
        const panelTop = sideBelow ? pos.y + h + entryClusterGap + entryClusterH + 8 : undefined
        const panelBottom = sideBelow
          ? undefined
          : window.innerHeight - pos.y - entryClusterGap + entryClusterH + 8

        // 首帧加载完成前容器 visibility:hidden（不可见也不可点），加载后淡入。
        return React.createElement(React.Fragment, null,
          React.createElement('div', {
            className: 'toto-wrap',
            style: {
              position: 'fixed',
              left: pos.x,
              top: pos.y,
              width: w,
              height: h,
              pointerEvents: 'none',
              zIndex: 2147483000,
              visibility: imgReady ? 'visible' : 'hidden',
              opacity: imgReady ? 1 : 0,
              transition: 'opacity 0.15s ease',
            },
          },
            React.createElement('div', {
              className: 'toto-pet',
              ref: petRef,
              style: {
                pointerEvents: 'auto',
                cursor: 'grab',
                touchAction: 'none',
                width: '100%',
                height: '100%',
                position: 'relative',
              },
              onPointerEnter: pokeClose,
              onPointerDown,
              onPointerMove,
              onPointerUp: endDrag,
              onPointerCancel: endDrag,
            },
              React.createElement('img', {
                className: 'toto-img',
                src,
                alt: '',
                draggable: false,
                'aria-hidden': true,
                onLoad: () => setImgReady(true),
                onError: () => setImgError(true),
                style: {
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                  pointerEvents: 'none',
                  imageRendering: cfg.pixelated ? 'pixelated' : 'auto',
                  filter: 'drop-shadow(0 6px 10px rgba(0, 0, 0, 0.22))',
                },
              }),
              // × 叉号：默认隐藏，交互后出现、空闲 2.5 秒后自动隐藏
              React.createElement('button', {
                className: 'toto-close' + (closeVisible ? '' : ' toto-close-hidden'),
                type: 'button',
                title: t('close'),
                'aria-label': t('close'),
                onPointerDown: (e) => e.stopPropagation(),
                onClick: () => updateConfig({ visible: false }),
              }, '\u00d7'),
            ),
            // 入口簇：番茄闹钟 + 有关托托的30个事实（并列，挂在托托身上，纯文字）
            pomoEntry
              ? React.createElement('div', {
                  className: 'toto-pomo-entries',
                  style: {
                    position: 'fixed',
                    left: clamp(pos.x + w / 2 - 150, 8, Math.max(8, window.innerWidth - 308 - 8)),
                    bottom: entryClusterBottom,
                    zIndex: 1,
                    pointerEvents: 'auto',
                  },
                },
                React.createElement('button', {
                  className: 'toto-pomo-entry' + (running ? ' toto-pomo-entry-running' : ''),
                  type: 'button',
                  'aria-label': t('pomodoro'),
                  onPointerDown: (e) => e.stopPropagation(),
                  // 再次点击标题 = 开/关（切换时优先打开另一面板）
                  onClick: () => {
                    if (factsOpen) {
                      setFactsOpen(false)
                      setPanelOpen(true)
                    } else {
                      setPanelOpen((v) => !v)
                    }
                  },
                }, entryText),
                React.createElement('button', {
                  className: 'toto-pomo-entry toto-facts-entry',
                  type: 'button',
                  'aria-label': t('factsTitle'),
                  onPointerDown: (e) => e.stopPropagation(),
                  onClick: () => {
                    if (panelOpen) {
                      setPanelOpen(false)
                      setFactsOpen(true)
                    } else {
                      setFactsOpen((v) => !v)
                    }
                  },
                }, t('factsTitle')),
              )
              : null,
            // 番茄闹钟面板（贴近托托，出现在屏幕较空的一侧）
            panelOpen
              ? React.createElement('div', {
                  className: 'toto-panel',
                  style: {
                    position: 'fixed',
                    left: panelLeft,
                    [sideBelow ? 'top' : 'bottom']: sideBelow ? panelTop : panelBottom,
                    zIndex: 1,
                    pointerEvents: 'auto',
                  },
                },
                React.createElement('div', { className: 'tp-head' },
                  React.createElement('div', { className: 'tp-title' }, t('pomodoro'))),
                React.createElement('div', { className: 'toto-pomo-phase ' + phase },
                  React.createElement('span', { className: 'toto-pomo-label' }, phaseLabel),
                  React.createElement('span', { className: 'toto-pomo-time' }, fmtTime(remaining))),
                React.createElement('div', { className: 'toto-pomo-progress' },
                  React.createElement('div', {
                    className: 'toto-pomo-fill',
                    style: { width: Math.round(clamp(timerElapsed * 100, 0, 100)) + '%' },
                  })),
                React.createElement('div', { className: 'toto-pomo-actions' },
                  phase === 'idle'
                    ? React.createElement('button', { className: 'tp-btn tp-btn-primary', onClick: startWork }, t('start'))
                    : running
                      ? React.createElement('button', { className: 'tp-btn', onClick: pause }, t('pause'))
                      : React.createElement('button', { className: 'tp-btn tp-btn-primary', onClick: resume }, t('resume')),
                  React.createElement('button', { className: 'tp-btn', onClick: reset }, t('reset'))),
                phase === 'idle'
                  ? React.createElement('div', { className: 'toto-pomo-lens' },
                      WORK_CHOICES.map((m) => React.createElement('button', {
                        className: 'tp-btn' + (m === workMin ? ' tp-btn-active' : ''),
                        key: m,
                        onClick: () => updateConfig({ workMin: m }),
                      }, m + t('minute'))),
                      React.createElement('div', { className: 'toto-pomo-custom' },
                        React.createElement('span', { className: 'toto-pomo-custom-label' }, t('custom')),
                        React.createElement('input', {
                          className: 'tp-range',
                          type: 'range',
                          min: 1,
                          max: 120,
                          step: 1,
                          value: workMin,
                          onChange: (e) => applyWorkMin(e.target.value),
                        }),
                        React.createElement('input', {
                          className: 'toto-pomo-num',
                          type: 'number',
                          min: 1,
                          max: 120,
                          value: numDraft,
                          onChange: (e) => {
                            setNumDraft(e.target.value)
                            applyWorkMin(e.target.value) // 合法即实时生效（拉条联动）
                          },
                          onBlur: commitNumDraft,
                          onKeyDown: (e) => {
                            if (e.key === 'Enter') e.currentTarget.blur()
                          },
                        }),
                        React.createElement('span', { className: 'toto-pomo-custom-unit' }, t('minute'))),
                    )
                  : null,
                React.createElement('div', { className: 'toto-grow' },
                  React.createElement('div', { className: 'toto-grow-row' },
                    React.createElement('span', {}, t('level') + ' ' + level),
                    React.createElement('span', { className: 'toto-grow-xp' }, t('xp') + ': ' + prog.xp)),
                  React.createElement('div', { className: 'toto-pomo-progress' },
                    React.createElement('div', {
                      className: 'toto-pomo-fill toto-pomo-fill-xp',
                      style: { width: Math.round(clamp(progress * 100, 0, 100)) + '%' },
                    })),
                  React.createElement('div', { className: 'toto-grow-next' },
                    t('next') + ': ' + levelFloor(level + 1) + ' XP')),
              )
              : null,
            // 有关托托的 30 个事实面板（只显示标题，点击标题展开内容）
            factsOpen
              ? React.createElement('div', {
                  className: 'toto-panel',
                  style: {
                    position: 'fixed',
                    left: panelLeft,
                    [sideBelow ? 'top' : 'bottom']: sideBelow ? panelTop : panelBottom,
                    zIndex: 1,
                    pointerEvents: 'auto',
                  },
                },
                React.createElement('div', { className: 'tp-head' },
                  React.createElement('div', { className: 'tp-title' }, t('factsTitle'))),
                React.createElement('div', { className: 'toto-facts-progress' },
                  fmt(totalFactsUnlocked, t('factsProgress'))),
                React.createElement('div', { className: 'toto-facts-list' },
                  facts.map((f, i) =>
                    (i < factsUnlocked || (i === 29 && lastUnlocked))
                      ? React.createElement('div', { className: 'toto-fact', key: i },
                          React.createElement('button', {
                            className: 'toto-fact-title',
                            onClick: () => setFactsExpanded(factsExpanded === i ? -1 : i),
                          }, (factsExpanded === i ? '\u25be ' : '\u25b8 ') + f.title),
                          factsExpanded === i
                            ? React.createElement('div', { className: 'toto-fact-content' }, f.content)
                            : null)
                      : React.createElement('div', { className: 'toto-fact toto-fact-locked', key: i }, t('locked'))),
                  // 作者后记：30 级与第 30 条事实一起解锁
                  afterword !== null
                    ? lastUnlocked
                      ? React.createElement('div', { className: 'toto-fact toto-fact-afterword', key: 'afterword' },
                          React.createElement('button', {
                            className: 'toto-fact-title toto-fact-title-afterword',
                            onClick: () => setFactsExpanded(factsExpanded === -2 ? -1 : -2),
                          }, (factsExpanded === -2 ? '\u25be ' : '\u25b8 ') + afterword.title),
                          factsExpanded === -2
                            ? React.createElement('div', { className: 'toto-fact-content toto-fact-content-afterword' },
                                afterword.content.split('\n').map((p, pi) =>
                                  React.createElement('p', { key: pi, className: 'toto-afterword-p' }, p)))
                            : null)
                      : React.createElement('div', { className: 'toto-fact toto-fact-locked' },
                          afterword.title + ' · ' + t('afterwordHint'))
                    : null,
                ),
              )
              : null,
          ),
          // toast 独立于托托可见性（隐藏时也能看到升级提示）
          toast !== null
            ? React.createElement('div', {
                className: 'toto-toast',
                key: toast.key,
                style: { position: 'fixed', left: '50%', bottom: 96, transform: 'translateX(-50%)', zIndex: 2147483001, pointerEvents: 'none' },
              }, toast.text)
            : null,
        )
      }

      // ---------- 设置页 ----------
      function TotoSettings({ store, updateConfig, resetConfig, t }) {
        const cfg = useStore(store)

        const toggle = (key, label) => React.createElement('div', { className: 'tp-field', key },
          React.createElement('div', { className: 'tp-field-label' }, label),
          React.createElement('input', {
            className: 'tp-check',
            type: 'checkbox',
            checked: Boolean(cfg[key]),
            onChange: (e) => updateConfig({ [key]: e.target.checked }),
          }),
          React.createElement('span', { className: 'tp-cap' }, cfg[key] ? t('on') : t('off')))

        const resetPos = () => {
          const d = defaultPos(cfg)
          updateConfig({ x: d.x, y: d.y })
        }

        return React.createElement('div', { className: 'tp-page' },
          React.createElement('div', { className: 'tp-head' },
            React.createElement('div', { className: 'tp-title' }, t('settingsTitle')),
            React.createElement('button', { className: 'tp-btn', onClick: resetPos }, t('resetPos')),
            React.createElement('button', { className: 'tp-btn', onClick: () => resetConfig() }, t('resetAll'))),
          toggle('visible', t('show')),
          React.createElement('div', { className: 'tp-field' },
            React.createElement('div', { className: 'tp-field-label' }, t('scale')),
            React.createElement('span', { className: 'tp-cap' }, t('small')),
            React.createElement('input', {
              className: 'tp-range',
              type: 'range',
              min: 0.6,
              max: 1.8,
              step: 0.05,
              value: cfg.scale,
              onChange: (e) => updateConfig({ scale: Number(e.target.value) }),
            }),
            React.createElement('span', { className: 'tp-cap' }, t('large'))),
          toggle('animations', t('animations')),
          React.createElement('div', { className: 'tp-field' },
            React.createElement('div', { className: 'tp-field-label' }, t('speed')),
            React.createElement('span', { className: 'tp-cap' }, t('fast')),
            React.createElement('input', {
              className: 'tp-range',
              type: 'range',
              min: 120,
              max: 400,
              step: 20,
              value: Number(cfg.frameMs) > 0 ? cfg.frameMs : 240,
              onChange: (e) => updateConfig({ frameMs: Number(e.target.value) }),
            }),
            React.createElement('span', { className: 'tp-cap' }, t('slow'))),
          toggle('pixelated', t('pixelated')),
          cfg._assets === null
            ? React.createElement('div', { className: 'tp-hint' }, t('noAssets'))
            : React.createElement('div', { className: 'tp-hint' }, t('hint')))
      }

      // ---------- 插件主体 ----------
      return {
        inject: ['timer'],
        apply(ctx) {
          const slots = ctx.get('slots')
          if (slots === undefined) return

          // 国际化
          const locale = ctx.get('locale')
          let t = (key) => (zh[key] !== undefined ? zh[key] : key)
          if (locale !== undefined) {
            t = locale.bind(NS)
            const disposeLocale = locale.register(NS, { zh, en })
            ctx.on('dispose', () => { disposeLocale() })
          }

          // 配置 store + 持久化（_ 前缀键为运行时状态，不持久化）
          const store = createStore()
          const STORAGE_LIMIT = 16 * 1024
          const persist = () => {
            try {
              const cfg = store.get()
              const owned = {}
              for (const key of Object.keys(cfg)) {
                if (!key.startsWith('_')) owned[key] = cfg[key]
              }
              const value = JSON.stringify(owned)
              if (value.length > STORAGE_LIMIT) return
              localStorage.setItem(STORAGE_KEY, value)
            } catch (err) {
              // localStorage 不可用（隐私模式/配额）——保留内存态。
            }
          }
          const updateConfig = (patch, save = true) => {
            store.set(patch)
            if (save) persist()
          }
          const resetConfig = () => {
            const d = defaultPos(store.get())
            store.set({ ...DEFAULTS, x: d.x, y: d.y, _assets: store.get()._assets, _prog: store.get()._prog, _facts: store.get()._facts })
            persist()
          }
          try {
            const raw = localStorage.getItem(STORAGE_KEY)
            if (raw) {
              const data = JSON.parse(raw)
              if (data && typeof data === 'object') store.set(data)
            }
          } catch (err) {
            // 损坏的 JSON —— 回退默认值。
          }

          // 进度（经验值）：host 状态路由为准，localStorage 兜底
          const saveProgress = (xp) => {
            const value = Math.max(0, Math.floor(Number(xp) || 0))
            updateConfig({ _prog: { xp: value } }, false)
            try {
              localStorage.setItem(PROG_KEY, JSON.stringify({ xp: value }))
            } catch (err) {
              // ignore
            }
            fetch(STATE_URL, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ xp: value }),
            }).catch(() => { /* host 不可用则留在本地兜底 */ })
          }
          const loadProgress = () => {
            // 本地兜底先上（立即可见）
            try {
              const raw = localStorage.getItem(PROG_KEY)
              if (raw) {
                const d = JSON.parse(raw)
                if (d && Number.isFinite(d.xp)) store.set({ _prog: { xp: Math.floor(d.xp) } })
              }
            } catch (err) {
              // ignore
            }
            // host 状态为准（异步，成功后覆盖本地值）
            fetch(STATE_URL)
              .then((r) => (r.ok ? r.json() : null))
              .then((s) => {
                if (s && Number.isFinite(s.xp)) store.set({ _prog: { xp: Math.floor(s.xp) } })
              })
              .catch(() => { /* ignore */ })
          }
          loadProgress()

          // 探测外观资源（一次性；结果存入 _assets 供主体与设置页共享）
          probeFrames().then((frames) => {
            store.set({ _assets: frames ?? null })
          })

          // 加载事实文档（assets/有关托托的30个事实.md）；失败则回退占位符
          fetch(ASSET_BASE + encodeURIComponent(FACTS_MD))
            .then((r) => (r.ok ? r.text() : Promise.reject(new Error('facts md ' + r.status))))
            .then((text) => {
              const parsed = parseFactsDoc(text)
              if (parsed !== null) store.set({ _facts: parsed })
            })
            .catch(() => { /* 占位符兜底 */ })

          // 样式
          const styleEl = document.createElement('style')
          styleEl.textContent = `
            .toto-wrap { user-select: none; -webkit-user-select: none; }
            .toto-img { user-select: none; -webkit-user-drag: none; }
            .toto-restore {
              padding: 8px 14px;
              font-size: 12px;
              line-height: 1.4;
              color: var(--dsw-alias-label-primary);
              background: var(--dsw-alias-bg-layer-2);
              border: 1px solid var(--dsw-alias-border-l2);
              border-radius: 999px;
              box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
              cursor: pointer;
              animation: toto-pop 0.18s ease-out;
              user-select: none;
              opacity: 0.8;
              transition: opacity 0.15s ease;
            }
            .toto-restore:hover {
              opacity: 1;
              color: var(--dsw-alias-brand-primary);
              border-color: var(--dsw-alias-brand-primary);
            }
            @keyframes toto-pop {
              from { opacity: 0; transform: translateY(-6px) scale(0.92); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
            .toto-close {
              position: absolute;
              top: 4px;
              right: 4px;
              width: 20px;
              height: 20px;
              padding: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
              line-height: 1;
              color: var(--dsw-alias-label-secondary);
              background: var(--dsw-alias-bg-layer-2);
              border: 1px solid var(--dsw-alias-border-l2);
              border-radius: 50%;
              cursor: pointer;
              opacity: 0.4;
              transition: opacity 0.15s ease;
              z-index: 1;
            }
            .toto-close:hover { color: var(--dsw-alias-brand-primary); border-color: var(--dsw-alias-brand-primary); }
            .toto-close-hidden {
              opacity: 0 !important;
              pointer-events: none;
            }
            /* 番茄闹钟入口（挂在托托身上的文字按钮） */
            .toto-pomo-entry {
              padding: 6px 14px;
              font-size: 12px;
              line-height: 1.4;
              color: var(--dsw-alias-label-primary);
              background: var(--dsw-alias-bg-layer-2);
              border: 1px solid var(--dsw-alias-border-l2);
              border-radius: 999px;
              box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
              cursor: pointer;
              user-select: none;
              white-space: nowrap;
              animation: toto-pop 0.15s ease-out;
            }
            .toto-pomo-entry:hover {
              border-color: var(--dsw-alias-brand-primary);
              color: var(--dsw-alias-brand-primary);
            }
            .toto-pomo-entry-running {
              border-color: var(--dsw-alias-brand-primary);
              color: var(--dsw-alias-brand-primary);
              font-variant-numeric: tabular-nums;
            }
            .toto-panel {
              width: 264px;
              max-height: 60vh;
              overflow-y: auto;
              padding: 12px;
              font-size: 13px;
              color: var(--dsw-alias-label-primary);
              background: var(--dsw-alias-bg-layer-2);
              border: 1px solid var(--dsw-alias-border-l2);
              border-radius: 12px;
              box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
            }
            .toto-toast {
              max-width: 264px;
              padding: 8px 12px;
              font-size: 12px;
              line-height: 1.5;
              color: var(--dsw-alias-label-primary);
              background: var(--dsw-alias-bg-layer-2);
              border: 1px solid var(--dsw-alias-border-l2);
              border-radius: 10px;
              box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
              animation: toto-pop 0.18s ease-out;
            }
            .toto-pomo-phase {
              display: flex;
              align-items: baseline;
              justify-content: space-between;
              margin: 6px 0 8px;
            }
            .toto-pomo-phase.work { color: var(--dsw-alias-brand-primary); }
            .toto-pomo-label { font-size: 12px; }
            .toto-pomo-time {
              font-size: 26px;
              font-weight: 600;
              font-variant-numeric: tabular-nums;
              letter-spacing: 1px;
            }
            .toto-pomo-progress {
              height: 6px;
              border-radius: 999px;
              background: var(--dsw-alias-border-l1);
              overflow: hidden;
            }
            .toto-pomo-fill {
              height: 100%;
              border-radius: 999px;
              background: var(--dsw-alias-brand-primary);
              transition: width 0.3s ease;
            }
            .toto-pomo-fill-xp { background: var(--dsw-alias-brand-primary); opacity: 0.7; }
            .toto-pomo-actions { display: flex; gap: 8px; margin: 10px 0 4px; }
            .tp-btn-primary {
              border-color: var(--dsw-alias-brand-primary) !important;
              color: var(--dsw-alias-brand-primary) !important;
              font-weight: 600;
            }
            .tp-btn-active {
              border-color: var(--dsw-alias-brand-primary) !important;
              color: var(--dsw-alias-brand-primary) !important;
            }
            .toto-pomo-lens { display: flex; gap: 6px; flex-wrap: wrap; margin: 6px 0 2px; }
            .toto-pomo-custom {
              display: flex;
              align-items: center;
              gap: 8px;
              width: 100%;
              margin-top: 8px;
              padding-top: 8px;
              border-top: 1px dashed var(--dsw-alias-border-l1);
            }
            .toto-pomo-custom-label {
              flex: none;
              font-size: 11px;
              color: var(--dsw-alias-label-secondary);
            }
            .toto-pomo-num {
              flex: none;
              width: 56px;
              padding: 4px 6px;
              font-size: 12px;
              color: var(--dsw-alias-label-primary);
              background: var(--dsw-alias-bg-layer-1);
              border: 1px solid var(--dsw-alias-border-l2);
              border-radius: 6px;
            }
            .toto-pomo-num:focus { outline: none; border-color: var(--dsw-alias-brand-primary); }
            .toto-pomo-custom-unit {
              flex: none;
              font-size: 11px;
              color: var(--dsw-alias-label-secondary);
            }
            .toto-grow { margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--dsw-alias-border-l1); }
            .toto-grow-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; }
            .toto-grow-xp { color: var(--dsw-alias-label-secondary); }
            .toto-grow-next { font-size: 11px; color: var(--dsw-alias-label-secondary); margin-top: 4px; }
            /* 入口簇与事实面板 */
            .toto-pomo-entries { display: flex; gap: 6px; }
            .toto-facts-entry { max-width: 190px; overflow: hidden; text-overflow: ellipsis; }
            .toto-facts-progress {
              font-size: 11px;
              color: var(--dsw-alias-label-secondary);
              margin-bottom: 8px;
            }
            .toto-facts-list { max-height: 46vh; overflow-y: auto; }
            .toto-fact { border-bottom: 1px dashed var(--dsw-alias-border-l1); }
            .toto-fact:last-of-type { border-bottom: none; }
            .toto-fact-title {
              width: 100%;
              padding: 7px 2px;
              font-size: 12px;
              text-align: left;
              color: var(--dsw-alias-label-primary);
              background: transparent;
              border: none;
              cursor: pointer;
            }
            .toto-fact-title:hover { color: var(--dsw-alias-brand-primary); }
            .toto-fact-content {
              font-size: 11px;
              line-height: 1.7;
              color: var(--dsw-alias-label-secondary);
              padding: 0 2px 8px;
            }
            .toto-fact-locked {
              padding: 7px 2px;
              font-size: 12px;
              color: var(--dsw-alias-label-secondary);
              letter-spacing: 2px;
            }
            .toto-fact-afterword { margin-top: 8px; border-top: 1px dashed var(--dsw-alias-border-l1); }
            .toto-fact-title-afterword { font-weight: 600; }
            .toto-afterword-p { margin: 0 0 8px; }
            /* 设置页（沿用 tp-* 前缀） */
            .tp-page { padding: 2px 0 16px; font-size: 13px; color: var(--dsw-alias-label-primary); }
            .tp-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
            .tp-title { font-size: 15px; font-weight: 600; margin-right: auto; }
            .tp-btn { padding: 4px 12px; font-size: 12px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 6px; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); cursor: pointer; }
            .tp-btn:hover { border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-brand-primary); }
            .tp-field { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--dsw-alias-border-l1); }
            .tp-field:last-of-type { border-bottom: none; }
            .tp-field-label { width: 96px; flex: none; font-size: 12px; color: var(--dsw-alias-label-secondary); }
            .tp-check { accent-color: var(--dsw-alias-brand-primary); }
            .tp-range { flex: 1; min-width: 0; accent-color: var(--dsw-alias-brand-primary); }
            .tp-cap { flex: none; width: 20px; text-align: center; font-size: 11px; color: var(--dsw-alias-label-secondary); }
            .tp-hint { font-size: 11px; color: var(--dsw-alias-label-secondary); margin-top: 12px; line-height: 1.6; }
          `
          document.head.appendChild(styleEl)
          ctx.on('dispose', () => {
            if (styleEl.parentNode) styleEl.parentNode.removeChild(styleEl)
          })

          // 注册覆盖层（托托本体，含番茄闹钟入口/面板）与设置页
          slots.inject('shell.overlay', () => slots.register(
            { name: 'shell.overlay', id: 'toto-hud', order: 100 },
            () => React.createElement(TotoPet, { ctx, store, updateConfig, persist, saveProgress, t }),
          ))

          slots.inject('settings.section', () => slots.register(
            { name: 'settings.section', id: 'toto-the-cat', order: 36, label: () => t('settingsTitle'), locale: NS },
            (props) => React.createElement(TotoSettings, { store, updateConfig, resetConfig, t: props.t }),
          ))
        },
      }
    },
  })
}
