import { useEffect, useRef } from 'react'

const POINTS = [
  { color: [180, 110, 250] },
  { color: [240,  90, 120] },
  { color: [250, 160,  80] },
  { color: [200, 150, 255] },
  { color: [245, 180, 210] },
  { color: [250, 200, 140] },
  { color: [160,  80, 230] },
  { color: [248, 130, 150] },
  { color: [210, 120, 255] },
]

export default function MeshBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let raf

    const seeds = POINTS.map(() => ({
      ax: Math.random() * Math.PI * 2,
      ay: Math.random() * Math.PI * 2,
      sx: 0.2 + Math.random() * 0.25,
      sy: 0.2 + Math.random() * 0.25,
      ox: 0.1 + Math.random() * 0.8,
      oy: 0.1 + Math.random() * 0.8,
      speed: 0.015 + Math.random() * 0.01,
    }))

    function resize() {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    let t = 0
    function draw() {
      const W = canvas.width, H = canvas.height
      ctx.fillStyle = '#faf8ff'
      ctx.fillRect(0, 0, W, H)

      const radius = Math.max(W, H) * 0.68
      POINTS.forEach((p, i) => {
        const s = seeds[i]
        const x = (s.ox + Math.sin(s.ax + t * s.speed)       * s.sx) * W
        const y = (s.oy + Math.sin(s.ay + t * s.speed * 0.7) * s.sy) * H
        const [r, g, b] = p.color
        const grd = ctx.createRadialGradient(x, y, 0, x, y, radius)
        grd.addColorStop(0,   `rgba(${r},${g},${b},0.48)`)
        grd.addColorStop(0.5, `rgba(${r},${g},${b},0.14)`)
        grd.addColorStop(1,   `rgba(${r},${g},${b},0)`)
        ctx.fillStyle = grd
        ctx.fillRect(0, 0, W, H)
      })

      t++
      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  )
}
