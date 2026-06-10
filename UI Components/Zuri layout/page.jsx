'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion'
import {
  Shield, Brain, Users, TrendingUp,
  Megaphone, Package, BarChart3, Sparkles,
  Crown, Settings, ChevronRight, ArrowRight,
  Zap, Eye, MessageSquare, CreditCard,
  LayoutDashboard, Lock, Star, Menu, X,
  ChefHat, GraduationCap, Bot, Calculator, BadgeCheck, Check,
} from 'lucide-react'

/* ─────────────────────────────────────────────
   Animation helpers
   ───────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 40, filter: 'blur(10px)' },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 1.2,
      delay: i * 0.1,
      ease: [0.16, 1, 0.3, 1] // Custom quint ease for premium feel
    }
  })
}

function Section({ children, className = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-15%' })
  return (
    <motion.section
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={{
        visible: { transition: { staggerChildren: 0.15 } }
      }}
      className={className}
    >
      {children}
    </motion.section>
  )
}
/* ─────────────────────────────────────────────
   Data
   ───────────────────────────────────────────── */
const officers = [
  {
    icon: Megaphone,
    title: 'Zuri Ads Optimized',
    subtitle: 'Senior Media Strategist',
    badge: 'Manus AI',
    desc: 'เชื่อมต่อ Meta API โดยตรง วางกลยุทธ์โฆษณาระดับนิตยสาร ตรวจสอบ Policy อัตโนมัติ ปรับงบประมาณแบบ Real-time เพื่อ ROAS สูงสุด',
  },
  {
    icon: MessageSquare,
    title: 'Zuri Sales Force',
    subtitle: 'The Closing Expert',
    badge: 'Always-On',
    desc: 'เฝ้า Inbox 24 ชม. วิเคราะห์ Intent ของลูกค้า คัดกรองโปรไฟล์ ส่งลิงก์ชำระเงินปิดการขายทันที ไม่พลาดทุก Lead',
  },
  {
    icon: Package,
    title: 'Zuri Warehouse & Finance',
    subtitle: 'The Inventory & Financial Guardian',
    badge: 'Dual-Audit',
    desc: 'ดูแลสต็อกวัตถุดิบและตัวเลขการเงินแบบครบวงจร ตัดสต็อกอัตโนมัติจาก POS พร้อม Dual-Model Auditing ป้องกันความผิดพลาด',
  },
  {
    icon: BarChart3,
    title: 'Zuri Business Analyst',
    subtitle: 'The Strategy Advisor',
    badge: 'Insight',
    desc: 'เปลี่ยนดาต้าดิบเป็น Insight ที่ใช้ได้จริง Daily Sales Brief ส่งตรง LINE ทุกเช้า วิเคราะห์ KPI แจ้งเตือนเมื่อตัวเลขผิดปกติ',
  },
]
const values = [
  {
    icon: Zap,
    title: 'Zero-Prompting Experience',
    desc: 'Gemini 1M Context รู้ทุกตัวเลขในธุรกิจคุณ ไม่ต้องสอนงานใหม่ ไม่ต้องป้อนบริบทซ้ำ',
  },
  {
    icon: Shield,
    title: 'Dual-Model Integrity',
    desc: 'AI 2 ตัวตรวจสอบซึ่งกันและกัน ยกระดับความถูกต้องสูงสุดในทุกการตัดสินใจ',
  },
  {
    icon: Crown,
    title: 'Human-in-the-Loop',
    desc: 'คุณยังเป็น "องค์อธิปัตย์" ของธุรกิจ ทุกขั้นตอนสำคัญต้องผ่านการอนุมัติจากคุณเสมอ',
  },
  {
    icon: Settings,
    title: 'Tailored Intelligence',
    desc: 'เลือกอัปเกรดสมองให้ Agent รายตำแหน่ง จ่ายเฉพาะจุดที่ต้องการ ไม่มีค่าใช้จ่ายซ่อน',
  },
]
const pricingTiers = [
  {
    name: 'Free',
    price: '0',
    period: '/เดือน',
    highlight: false,
    desc: 'ทดลองใช้',
    features: ['1 User', '50 แชท/เดือน', '100 คอนแทค/เดือน', 'Unified Inbox: FB + LINE'],
  },
  {
    name: 'Starter',
    price: '990',
    period: '/เดือน',
    highlight: false,
    desc: 'เริ่มต้นขายจริงจัง',
    features: ['3 Users', '500 แชท/เดือน', '1,000 คอนแทค/เดือน', 'CRM จัดการลูกค้า', 'Quick Sale ปิดการขายเร็ว', 'จัดการคิวงานทีม'],
  },
  {
    name: 'Pro',
    price: '2,990',
    period: '/เดือน',
    highlight: true,
    badge: 'แนะนำ',
    desc: 'ครบทุกเครื่องมือขาย',
    features: ['10 Users', '2,000 แชท/เดือน', '5,000 คอนแทค/เดือน', 'Full POS ระบบขายหน้าร้าน', 'ROAS Analytics วัดผลโฆษณา', 'AI ร่างข้อความ 100 ครั้ง/เดือน', 'AI สแกนสลิปอัตโนมัติ'],
  },
  {
    name: 'Business',
    price: '5,990',
    period: '/เดือน',
    highlight: false,
    desc: 'ไม่จำกัด ทุกอย่าง',
    features: ['Unlimited Users', 'Unlimited แชท', 'Unlimited คอนแทค', 'AI ทุกฟีเจอร์ไม่จำกัด', 'สรุปยอดขายรายวันส่ง LINE'],
  },
]

const industryAddons = [
  { icon: ChefHat, name: 'Kitchen Ops', price: '+฿790/เดือน', desc: 'ร้านอาหาร/โรงเรียนสอนทำอาหาร: สูตรอาหาร, BOM, ตัดสต๊อก FEFO อัตโนมัติ' },
  { icon: GraduationCap, name: 'Enrollment', price: '+฿790/เดือน', desc: 'โรงเรียน/สถาบันฝึกอบรม: จัดการคอร์ส, ตารางเรียน, เช็คชื่อ, ใบประกาศนียบัตร' },
  { icon: Bot, name: 'AI Agent', price: '+฿990/เดือน', desc: 'AI ตอบแชทลูกค้าอัตโนมัติ 24/7 + ส่งต่อพนักงานเมื่อเจอเคสยาก' },
]

const platformAddons = [
  { icon: Brain, name: 'AI Starter', price: '฿890/เดือน', desc: 'ปุ่มแชทถามข้อมูลธุรกิจผ่านเว็บ 100 คำถาม/เดือน' },
  { icon: Brain, name: 'AI Pro', price: '฿1,290/เดือน', desc: 'แชทถามข้อมูลเว็บ+LINE Bot ไม่จำกัด, บอทสิง LINE กลุ่มดักจับสลิป+สรุปยอด' },
  { icon: Calculator, name: 'Accounting Platform', price: 'จ่ายครั้งเดียว (TBD)', desc: 'เชื่อมต่อ FlowAccount API + Express X-import' },
]

/* ─────────────────────────────────────────────
   Main Component
   ───────────────────────────────────────────── */
export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Mouse Parallax Logic
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springX = useSpring(mouseX, { damping: 30, stiffness: 120 })
  const springY = useSpring(mouseY, { damping: 30, stiffness: 120 })

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    const onMouseMove = (e) => {
      const { clientX, clientY } = e
      const moveX = (clientX - window.innerWidth / 2) / 30
      const moveY = (clientY - window.innerHeight / 2) / 30
      mouseX.set(moveX)
      mouseY.set(moveY)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('mousemove', onMouseMove)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, [mouseX, mouseY])

  return (
    <div className="bg-[#F7F8FA] text-[#1A1710] selection:bg-brand/20 selection:text-brand-dark">

      {/* ══════════════════════════════════════
          Navigation
         ══════════════════════════════════════ */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-700 ${
        scrolled
          ? 'glass-topbar py-3'
          : 'bg-transparent py-5'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 lg:px-10 h-16 lg:h-20">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand via-brand to-brand-dark flex items-center justify-center shadow-lg shadow-brand/20 group-hover:shadow-brand/40 transition-shadow">
              <span className="text-white font-bold text-base font-headline">Z</span>
            </div>
            <span className="text-xl font-bold tracking-tight font-headline text-[#1A1710]">Zuri</span>
          </a>
          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-8">
            <a href="#officers" className="text-xs font-label font-semibold uppercase tracking-widest text-[#4A4435] hover:text-brand transition-colors">AI Officers</a>
            <a href="#values" className="text-xs font-label font-semibold uppercase tracking-widest text-[#4A4435] hover:text-brand transition-colors">Why Zuri</a>
            <a href="#pricing" className="text-xs font-label font-semibold uppercase tracking-widest text-[#4A4435] hover:text-brand transition-colors">Pricing</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <a href="/login" className="px-5 py-2.5 bg-[#1A1710] rounded-lg text-xs font-label font-bold uppercase tracking-wider text-white hover:bg-black transition-all shadow-lg shadow-black/5">
              เข้าสู่ระบบ
            </a>
            <a href="/register" className="px-5 py-2.5 rounded-lg btn-accent-premium text-white text-xs font-label font-bold uppercase tracking-wider">
              เริ่มใช้ฟรี
            </a>
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-[#1A1710]"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {/* Mobile menu */}
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden glass-login-warm px-6 py-8 space-y-6 border-b border-[#1A1710]/5"
          >
            <a href="#officers" onClick={() => setMenuOpen(false)} className="block text-sm font-label font-semibold text-[#1A1710]">AI Officers</a>
            <a href="#values" onClick={() => setMenuOpen(false)} className="block text-sm font-label font-semibold text-[#1A1710]">Why Zuri</a>
            <a href="#pricing" onClick={() => setMenuOpen(false)} className="block text-sm font-label font-semibold text-[#1A1710]">Pricing</a>
            <hr className="border-[#1A1710]/5" />
            <a href="/login" onClick={() => setMenuOpen(false)} className="block text-center py-4 rounded-lg bg-brand/5 border border-brand/10 font-label font-bold text-sm text-brand-dark">
              เข้าสู่ระบบ
            </a>
            <a href="/register" onClick={() => setMenuOpen(false)} className="block text-center py-4 rounded-lg btn-accent-premium text-white font-label font-bold text-sm">
              เริ่มใช้ฟรี
            </a>
            <a href="/contact" onClick={() => setMenuOpen(false)} className="block text-center py-4 rounded-lg border border-[#1A1710]/10 font-label font-bold text-sm text-[#4A4435]">
              นัดปรึกษา
            </a>
          </motion.div>
        )}
      </nav>
      <main className="overflow-x-hidden">

        {/* ══════════════════════════════════════
            Section 1 — Hero Zone
           ══════════════════════════════════════ */}
        <Section className="relative min-h-screen flex items-center pt-32 pb-24 lg:pt-40 lg:pb-32 overflow-hidden">
          {/* Background Layer with Parallax */}
          <motion.div 
            style={{ x: springX, y: springY }}
            className="absolute inset-0 z-0 pointer-events-none"
          >
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60 scale-110"
              style={{ backgroundImage: 'url("/images/landing-hero-warm-bg.png")' }}
            />
            {/* Ambient Overlays — Airy Light */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#F7F8FA]/60 via-transparent to-[#F7F8FA]" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#F7F8FA] via-transparent to-transparent opacity-80" />
          </motion.div>

          {/* Floating light streaks (Parallax Layer 2) */}
          <motion.div 
            style={{ x: useTransform(springX, (v) => v * -1.5), y: useTransform(springY, (v) => v * -1.5) }}
            className="absolute inset-0 z-1 pointer-events-none"
          >
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-brand/5 blur-[120px] mix-blend-screen" />
            <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] rounded-full bg-brand-dark/5 blur-[140px] mix-blend-screen" />
          </motion.div>

          <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 w-full">
            <div className="max-w-4xl">
              {/* Tagline */}
              <motion.div variants={fadeUp} custom={0} className="mb-8">
                <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10">
                  <Sparkles size={14} className="text-brand" />
                  <span className="text-[11px] font-label font-bold uppercase tracking-[0.2em] text-brand-tint">
                    The Modern Sovereign AI Platform
                  </span>
                </span>
              </motion.div>
              {/* Headline */}
              <motion.h1 variants={fadeUp} custom={1} className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold font-headline leading-[1.1] tracking-tight text-[#1A1710]">
                {'อยากมี '}
                <span className="relative inline-block">
                  <span className="relative z-10 bg-gradient-to-r from-brand via-brand-hover to-brand bg-clip-text text-transparent">{'"ซูริ"'}</span>
                  <span className="absolute -bottom-2 left-0 w-full h-[6px] bg-brand/10 -z-0 rounded-full blur-[2px]" />
                </span>
                <br className="hidden lg:block" />
                {' เป็นของตัวเอง'}
              </motion.h1>

              {/* Sub-headline */}
              <motion.p variants={fadeUp} custom={2} className="mt-10 text-lg sm:text-xl lg:text-2xl leading-relaxed text-[#4A4435] font-body max-w-3xl" style={{ lineHeight: 1.8 }}>
                ลืมระบบซอฟต์แวร์ที่ซับซ้อนไปได้เลย ซูริ คือ "ผู้ช่วยส่วนตัว" ที่ออกแบบโดยเน้นความเป็นมนุษย์
                และพร้อมประคองคุณอยู่เบื้องหลังเงียบๆ ด้วยแนวคิด <span className="text-brand font-bold">Warm Minimalist</span>
                ลดภาระสมองเพื่อให้คุณโฟกัสกับกลยุทธ์ ช่วยให้ทีม AI Multi-Agent ทำงานแทนคุณได้อย่างเป็นธรรมชาติ 
                และรู้ลึกถึงทุกบริบทธุรกิจของคุณตั้งแต่วันแรก
              </motion.p>
              {/* CTA Buttons */}
              <motion.div variants={fadeUp} custom={3} className="mt-14 flex flex-col sm:flex-row gap-5">
                <a
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 px-10 py-5 rounded-xl btn-accent-premium text-white font-label font-bold text-sm uppercase tracking-wider"
                >
                  เริ่มต้นใช้งาน Zuri ฟรี
                  <ArrowRight size={18} />
                </a>
                <a
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 px-10 py-5 rounded-xl border border-[#1A1710]/10 text-[#4A4435] font-label font-bold text-sm uppercase tracking-wider hover:bg-[#1A1710]/5 transition-all"
                >
                  นัดปรึกษาการวางระบบ AI
                  <ChevronRight size={18} />
                </a>
              </motion.div>

              <motion.div variants={fadeUp} custom={3.5} className="mt-8 flex justify-center lg:justify-start">
                <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-brand/5 border border-brand/10 backdrop-blur-sm shadow-sm transition-all duration-300">
                  <span className="text-xs font-label font-medium text-[#4A4435]/60">มีบัญชีอยู่แล้ว?</span>
                  <a href="/login" className="text-xs font-label font-bold text-brand hover:text-brand-dark transition-colors flex items-center gap-1 group">
                    เข้าสู่ระบบ
                    <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </div>
              </motion.div>

              {/* Trust signal */}
              <motion.div variants={fadeUp} custom={4} className="mt-12 flex items-center gap-3 text-[#4A4435]/40">
                <Lock size={14} />
                <span className="text-xs font-label tracking-wide">Sovereign Cloud Security</span>
                <span className="text-[#1A1710]/10">|</span>
                <Star size={14} />
                <span className="text-xs font-label tracking-wide">Trusted by Thai Businesses</span>
              </motion.div>
            </div>
          </div>
        </Section>
        {/* ══════════════════════════════════════
            Section 2 — AI Officers
           ══════════════════════════════════════ */}
        <Section id="officers" className="py-24 lg:py-32 relative">
          {/* Subtle texture */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #1A1710 1px, transparent 0)', backgroundSize: '40px 40px' }} />

          <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10">
            <motion.div variants={fadeUp} custom={0} className="text-center mb-16 lg:mb-20">
              <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-brand/5 border border-brand/10 mb-6">
                <Users size={14} className="text-brand" />
                <span className="text-xs font-label font-bold uppercase tracking-[0.2em] text-brand">
                  AI Department
                </span>
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-headline text-[#1A1710] leading-tight">
                ทีมงาน AI ที่พร้อมรันธุรกิจ<br className="hidden sm:block" />แทนคุณตลอด 24 ชั่วโมง
              </h2>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {officers.map((officer, i) => {
                const Icon = officer.icon
                return (
                  <motion.div
                    key={officer.title}
                    variants={fadeUp}
                    custom={i + 1}
                    className="group relative glass-card-warm rounded-2xl p-8 lg:p-10 transition-all duration-500 hover:shadow-xl hover:shadow-brand/5"
                  >
                    <div className="flex items-start gap-6">
                      <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-brand/5 border border-brand/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-brand/10 transition-all duration-500">
                        <Icon size={24} className="text-brand" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-xl font-bold font-headline text-[#1A1710]">{officer.title}</h3>
                          <span className="hidden sm:inline-flex px-2 py-0.5 rounded-md bg-brand/5 text-[10px] font-label font-bold uppercase tracking-wider text-brand border border-brand/20">
                            {officer.badge}
                          </span>
                        </div>
                        <p className="text-xs font-label font-semibold uppercase tracking-widest text-brand/60 mb-5">{officer.subtitle}</p>
                        <p className="text-sm text-[#4A4435] font-body leading-relaxed" style={{ lineHeight: 1.8 }}>{officer.desc}</p>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </Section>
        {/* ══════════════════════════════════════
            Section 3 — Core Values (Why Zuri?)
           ══════════════════════════════════════ */}
        <Section id="values" className="py-24 lg:py-32 bg-[#F0F2F5]/40 relative">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-brand/5 blur-[120px]" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-brand-dark/5 blur-[100px]" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10">
            <motion.div variants={fadeUp} custom={0} className="text-center mb-16 lg:mb-20">
              <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-brand/5 border border-brand/10 mb-6">
                <Brain size={14} className="text-brand" />
                <span className="text-xs font-label font-bold uppercase tracking-[0.2em] text-brand">
                  Why Zuri
                </span>
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-headline text-[#1A1710] leading-tight">
                ปรัชญาที่ทำให้ ซูริ<br className="hidden sm:block" />แตกต่างจากทุกแพลตฟอร์ม
              </h2>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {values.map((v, i) => {
                const Icon = v.icon
                return (
                  <motion.div
                    key={v.title}
                    variants={fadeUp}
                    custom={i + 1}
                    className="group glass-card-warm text-center p-8 lg:p-10 rounded-2xl transition-all duration-500 hover:shadow-lg hover:shadow-brand/5"
                  >
                    <div className="w-14 h-14 mx-auto mb-6 rounded-2xl bg-brand/5 border border-brand/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-brand/10 transition-all duration-500">
                      <Icon size={24} className="text-brand" />
                    </div>
                    <h3 className="text-lg font-bold font-headline text-[#1A1710] mb-3">{v.title}</h3>
                    <p className="text-sm text-[#4A4435] font-body leading-relaxed" style={{ lineHeight: 1.8 }}>{v.desc}</p>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </Section>
        {/* ══════════════════════════════════════
            Section 4 — Pricing
           ══════════════════════════════════════ */}
        <Section id="pricing" className="py-24 lg:py-32 relative">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-brand/10 to-transparent" />
            <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-brand/5 blur-[140px]" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10">
            {/* Section header */}
            <motion.div variants={fadeUp} custom={0} className="text-center mb-16 lg:mb-20">
              <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-brand/5 border border-brand/10 mb-6">
                <CreditCard size={14} className="text-brand" />
                <span className="text-xs font-label font-bold uppercase tracking-[0.2em] text-brand">
                  Pricing
                </span>
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-headline text-[#1A1710] leading-tight">
                แพ็กเกจที่ออกแบบมา<br className="hidden sm:block" />เพื่อธุรกิจไทยโดยเฉพาะ
              </h2>
              <p className="mt-6 text-lg text-[#4A4435] font-body max-w-2xl mx-auto" style={{ lineHeight: 1.8 }}>
                เลือก Base Plan ที่เหมาะกับขนาดทีม แล้วเสริม Add-on เฉพาะจุดที่ต้องการ จ่ายเท่าที่ใช้จริง
              </p>
            </motion.div>

            {/* DEPA Voucher Banner */}
            <motion.div variants={fadeUp} custom={0.5} className="mb-12 lg:mb-16">
              <div className="relative rounded-2xl overflow-hidden glass-card-warm border border-brand/20 px-6 py-8 sm:px-10 sm:py-8 flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
                <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-brand via-brand-hover to-brand-dark flex items-center justify-center shadow-xl shadow-brand/20">
                  <BadgeCheck size={32} className="text-white" />
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xl sm:text-2xl font-bold font-headline text-[#1A1710]">
                    รองรับโครงการ DEPA Voucher สูงสุด 10,000 บาท
                  </p>
                  <p className="mt-2 text-sm sm:text-base text-[#4A4435] font-body opacity-80 font-medium">
                    ครอบคลุม Pro ฟรี 3+ เดือน หรือ Business ฟรี ~1.5 เดือน เพิ่มสปีดให้ธุรกิจคุณด้วย AI ทันที
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Base Tier Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-5 items-start">
              {pricingTiers.map((tier, i) => (
                <motion.div
                  key={tier.name}
                  variants={fadeUp}
                  custom={i + 1}
                  className={`relative flex flex-col rounded-[28px] overflow-hidden transition-all duration-500 ${
                    tier.highlight
                      ? 'shadow-2xl shadow-brand/20 md:scale-[1.02] lg:scale-105 z-10 ring-2 ring-brand/40'
                      : 'shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] hover:shadow-xl'
                  }`}
                >
                  {/* ── Visual header — MangoCards top section ── */}
                  <div
                    className="relative h-[128px] flex flex-col justify-end px-6 pb-5"
                    style={{
                      background: tier.highlight
                        ? 'linear-gradient(135deg, #f97316 0%, #a855f7 55%, #1e1b4b 100%)'
                        : 'linear-gradient(135deg, #fda4af 0%, #c084fc 50%, #93c5fd 100%)',
                    }}
                  >
                    {/* Recommended badge */}
                    {tier.highlight && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="inline-flex items-center gap-1.5 px-5 py-1.5 rounded-full bg-brand text-white text-[11px] font-label font-bold uppercase tracking-[0.1em] shadow-lg shadow-brand/30">
                          <Star size={12} fill="currentColor" />
                          {tier.badge}
                        </span>
                      </div>
                    )}
                    {/* Price badge — top right, MangoCards style */}
                    <div className="absolute top-4 right-4">
                      <div className="bg-black/30 backdrop-blur-md text-white text-sm font-bold px-3.5 py-1 rounded-full">
                        {tier.price === '0' ? 'ฟรี' : `฿${tier.price}`}
                        {tier.price !== '0' && (
                          <span className="text-[11px] font-normal opacity-75 ml-1">{tier.period}</span>
                        )}
                      </div>
                    </div>
                    {/* Tier name at bottom of header */}
                    <div className={tier.highlight ? 'mt-5' : ''}>
                      <h3 className="text-xl font-bold font-headline text-white">{tier.name}</h3>
                      <p className="text-xs text-white/70 font-body mt-0.5 font-medium">{tier.desc}</p>
                    </div>
                  </div>

                  {/* ── Content section — MangoCards bottom section ── */}
                  <div className={`flex flex-col flex-1 px-6 py-5 ${tier.highlight ? 'bg-[#1A1710]' : 'bg-white'}`}>
                    <ul className="space-y-3.5 mb-7 flex-1">
                      {tier.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5">
                          <Check size={15} className="flex-shrink-0 mt-0.5 text-brand" />
                          <span className={`text-[13px] font-body leading-snug ${tier.highlight ? 'text-gray-300' : 'text-[#4A4435]'}`}>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <a
                      href={tier.price === '0' ? '/register' : '/contact'}
                      className={`block text-center py-4 rounded-[18px] text-[14px] font-label font-semibold transition-all ${
                        tier.highlight
                          ? 'bg-brand text-white hover:bg-brand-dark shadow-lg shadow-brand/30'
                          : 'bg-[#1A1710] text-white hover:bg-black'
                      }`}
                    >
                      {tier.price === '0' ? 'เริ่มต้นฟรี' : 'เลือกแพ็กเกจนี้'}
                    </a>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Add-ons Section */}
            <motion.div variants={fadeUp} custom={5} className="mt-24 lg:mt-32">
              <div className="text-center mb-12">
                <h3 className="text-2xl sm:text-3xl font-bold font-headline text-[#1A1710]">
                  Industry Add-ons
                </h3>
                <p className="mt-3 text-base text-[#4A4435] font-body opacity-80">
                  ซื้อเพิ่มได้ตั้งแต่ Starter ขึ้นไป เลือกเฉพาะที่ธุรกิจคุณต้องการ
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {industryAddons.map((addon, i) => {
                  const Icon = addon.icon
                  return (
                    <motion.div
                      key={addon.name}
                      variants={fadeUp}
                      custom={i + 1}
                      className="group flex items-start gap-5 p-7 rounded-2xl glass-card-warm transition-all duration-500 hover:shadow-lg hover:shadow-brand/5"
                    >
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-brand/5 border border-brand/10 flex items-center justify-center group-hover:bg-brand/10 transition-all duration-500">
                        <Icon size={22} className="text-brand" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-lg font-bold font-headline text-[#1A1710]">{addon.name}</h4>
                        </div>
                        <p className="text-xs font-label font-bold text-brand mb-3 uppercase tracking-wider">{addon.price}</p>
                        <p className="text-sm text-[#4A4435] font-body leading-relaxed" style={{ lineHeight: 1.8 }}>{addon.desc}</p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>

            {/* Platform Add-ons */}
            <motion.div variants={fadeUp} custom={6} className="mt-16 lg:mt-20">
              <div className="text-center mb-12">
                <h3 className="text-2xl sm:text-3xl font-bold font-headline text-[#1A1710]">
                  Platform Add-ons
                </h3>
                <p className="mt-3 text-base text-[#4A4435] font-body opacity-80">
                  เสริมพลัง AI และเชื่อมต่อระบบบัญชีให้ธุรกิจครบวงจร
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {platformAddons.map((addon, i) => {
                  const Icon = addon.icon
                  return (
                    <motion.div
                      key={addon.name}
                      variants={fadeUp}
                      custom={i + 1}
                      className="group flex items-start gap-5 p-7 rounded-2xl glass-card-warm transition-all duration-500 hover:shadow-lg hover:shadow-brand/5"
                    >
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-brand/5 border border-brand/10 flex items-center justify-center group-hover:bg-brand/10 transition-all duration-500">
                        <Icon size={22} className="text-brand" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-lg font-bold font-headline text-[#1A1710]">{addon.name}</h4>
                        </div>
                        <p className="text-xs font-label font-bold text-brand mb-3 uppercase tracking-wider">{addon.price}</p>
                        <p className="text-sm text-[#4A4435] font-body leading-relaxed" style={{ lineHeight: 1.8 }}>{addon.desc}</p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          </div>
        </Section>

        {/* ══════════════════════════════════════
            Section 5 — Final CTA
           ══════════════════════════════════════ */}
        <Section className="py-24 lg:py-32 bg-[#F7F8FA] relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-brand/5 blur-[160px] opacity-70" />
          </div>
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <motion.div variants={fadeUp} custom={0} className="relative rounded-3xl overflow-hidden shadow-2xl shadow-brand/5 border border-brand/10">
              {/* Card background */}
              <div className="absolute inset-0 bg-white" />
              <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #1A1710 1px, transparent 0)', backgroundSize: '40px 40px' }} />
              <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-brand/10 blur-3xl opacity-50" />
              <div className="absolute -bottom-32 -left-32 w-72 h-72 rounded-full bg-brand/5 blur-3xl opacity-50" />

              <div className="relative z-10 px-8 py-16 sm:px-12 sm:py-20 lg:px-20 lg:py-24 text-center">
                <motion.div variants={fadeUp} custom={1} className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-brand/5 border border-brand/10 mb-8">
                  <Sparkles size={14} className="text-brand" />
                  <span className="text-xs font-label font-bold uppercase tracking-[0.2em] text-brand">
                    Get Started Today
                  </span>
                </motion.div>

                <motion.h2 variants={fadeUp} custom={2} className="text-3xl sm:text-4xl lg:text-5xl font-bold font-headline text-[#1A1710] leading-tight max-w-3xl mx-auto">
                  เริ่มต้นสร้างทีมงานอัจฉริยะ<br className="hidden sm:block" />ของคุณวันนี้
                </motion.h2>
                <motion.p variants={fadeUp} custom={3} className="mt-6 text-base sm:text-lg text-[#4A4435] font-body max-w-2xl mx-auto opacity-90" style={{ lineHeight: 1.8 }}>
                  ไม่ว่าธุรกิจของคุณจะเล็กหรือใหญ่ ซูริ พร้อมเป็นทีมงาน AI ที่เข้าใจทุกมิติของธุรกิจคุณ เริ่มต้นใช้งานได้ทันทีโดยไม่มีค่าใช้จ่าย
                </motion.p>

                <motion.div variants={fadeUp} custom={4} className="mt-14 flex flex-col sm:flex-row justify-center gap-5">
                  <a
                    href="/register"
                    className="inline-flex items-center justify-center gap-2 px-10 py-5 rounded-xl btn-accent-premium text-white font-label font-bold text-sm uppercase tracking-wider"
                  >
                    เริ่มต้นใช้งาน ซูริ ฟรี
                    <ArrowRight size={18} />
                  </a>
                  <a
                    href="/contact"
                    className="inline-flex items-center justify-center gap-2 px-10 py-5 rounded-xl border border-brand/20 text-[#1A1710] font-label font-bold text-sm uppercase tracking-wider hover:bg-brand/5 transition-all"
                  >
                    นัดปรึกษาการวางระบบ AI
                    <ChevronRight size={18} />
                  </a>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </Section>
      </main>

      {/* ══════════════════════════════════════
          Footer
         ══════════════════════════════════════ */}
      <footer className="bg-[#F7F8FA] border-t border-brand/10 py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-12">
            {/* Brand */}
            <div className="max-w-xs">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
                  <span className="text-white font-bold text-sm font-headline">Z</span>
                </div>
                <span className="text-lg font-bold tracking-tight font-headline text-[#1A1710]">Zuri</span>
              </div>
              <p className="text-sm text-[#4A4435] font-body leading-relaxed" style={{ lineHeight: 1.8 }}>
                แพลตฟอร์ม AI Multi-Agent สำหรับธุรกิจไทย ที่ออกแบบมาเพื่อให้คุณบริหารได้อย่างนิ่งสงบ
              </p>
            </div>
            {/* Links */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-10">
              <div className="space-y-3">
                <h4 className="text-xs font-label font-bold uppercase tracking-widest text-[#1A1710]/40">Product</h4>
                <ul className="space-y-2 text-sm text-[#4A4435]/60 font-body font-medium">
                  <li><a className="hover:text-brand transition-colors" href="#">Features</a></li>
                  <li><a className="hover:text-brand transition-colors" href="#">Pricing</a></li>
                  <li><a className="hover:text-brand transition-colors" href="#">Integrations</a></li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="text-xs font-label font-bold uppercase tracking-widest text-[#1A1710]/40">Company</h4>
                <ul className="space-y-2 text-sm text-[#4A4435]/60 font-body font-medium">
                  <li><a className="hover:text-brand transition-colors" href="#">About Us</a></li>
                  <li><a className="hover:text-brand transition-colors" href="#">Privacy Policy</a></li>
                  <li><a className="hover:text-brand transition-colors" href="#">Terms of Service</a></li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="text-xs font-label font-bold uppercase tracking-widest text-[#1A1710]/40">Support</h4>
                <ul className="space-y-2 text-sm text-[#4A4435]/60 font-body font-medium">
                  <li><a className="hover:text-brand transition-colors" href="#">Help Center</a></li>
                  <li><a className="hover:text-brand transition-colors" href="/contact">Contact</a></li>
                  <li><a className="hover:text-brand transition-colors" href="#">Documentation</a></li>
                </ul>
              </div>
            </div>
          </div>
          {/* Divider + Copyright */}
          <div className="pt-8 border-t border-brand/5 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-[#1A1710]/40 font-label font-medium">
              &copy; {new Date().getFullYear()} Zuri Platform. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a href="/login" className="text-xs text-[#1A1710]/40 font-label font-medium hover:text-brand transition-colors">Login</a>
              <span className="text-brand/20">|</span>
              <a href="/register" className="text-xs text-[#1A1710]/40 font-label font-medium hover:text-brand transition-colors">Register</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
