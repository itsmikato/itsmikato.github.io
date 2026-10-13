import { useEffect, useRef } from "react";

type Shape = {
    x: number;
    y: number;
    size: number;
    vx: number;
    vy: number;
    rotation: number;
    vr: number; // rotation speed
    type: "triangle" | "rect";
    colorA: string;
    colorB: string;
};

const NEON = ["#39ff14", "#00ffff", "#ff10f0", "#f5ff00", "#ff6ec7"];

// keep the background quiet so the artwork stays the focus
const SHAPE_COUNT = 14;
const SHAPE_ALPHA = 0.28;
const MAX_SPEED = 0.25;

export default function CanvasBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animId = useRef<number | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        let redraw: (() => void) | null = null;
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            redraw?.();
        };
        resize();
        window.addEventListener("resize", resize);

        // ---- create shapes -------------------------------------------------
        const rnd = (min: number, max: number) => Math.random() * (max - min) + min;
        const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

        const shapes: Shape[] = Array.from({ length: SHAPE_COUNT }, () => ({
            x: rnd(0, canvas.width),
            y: rnd(0, canvas.height),
            size: rnd(24, 60),
            vx: rnd(-MAX_SPEED, MAX_SPEED),
            vy: rnd(-MAX_SPEED, MAX_SPEED),
            rotation: rnd(0, Math.PI * 2),
            vr: rnd(-0.003, 0.003),
            type: Math.random() < 0.5 ? "triangle" : "rect",
            colorA: pick(NEON),
            colorB: pick(NEON),
        }));
        // -------------------------------------------------------------------

        const drawShape = (s: Shape) => {
            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate(s.rotation);
            ctx.globalAlpha = SHAPE_ALPHA;

            // fluorescent gradient fill
            const grad = ctx.createLinearGradient(-s.size, -s.size, s.size, s.size);
            grad.addColorStop(0, s.colorA);
            grad.addColorStop(1, s.colorB);
            ctx.fillStyle = grad;

            if (s.type === "rect") {
                ctx.fillRect(-s.size / 2, -s.size / 2, s.size, s.size);
            } else {
                ctx.beginPath();
                ctx.moveTo(0, -s.size / 2);
                ctx.lineTo(s.size / 2, s.size / 2);
                ctx.lineTo(-s.size / 2, s.size / 2);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
        };

        const draw = () => {
            // repaint background
            ctx.fillStyle = "#0e0e0e";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            shapes.forEach(drawShape);
        };

        const animate = () => {
            animId.current = requestAnimationFrame(animate);

            shapes.forEach(s => {
                s.x += s.vx;
                s.y += s.vy;
                s.rotation += s.vr;

                // bounce off edges (abs() so shapes can't get stuck after a resize)
                if (s.x < 0) s.vx = Math.abs(s.vx);
                if (s.x > canvas.width) s.vx = -Math.abs(s.vx);
                if (s.y < 0) s.vy = Math.abs(s.vy);
                if (s.y > canvas.height) s.vy = -Math.abs(s.vy);
            });
            draw();
        };

        // respect the OS "reduce motion" setting: draw one still frame
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduceMotion) {
            redraw = draw;
            draw();
        } else {
            animate();
        }

        return () => {
            if (animId.current !== null) cancelAnimationFrame(animId.current);
            window.removeEventListener("resize", resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed top-0 left-0 w-full h-full z-[1]"
        />
    );
}
