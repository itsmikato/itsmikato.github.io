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
const SHAPES_PER_SCREEN = 14;       // density: shapes per viewport height of page
const MAX_SHAPES = 80;
const MAX_CANVAS_PIXELS = 16e6;     // iOS Safari refuses larger canvases
const SHAPE_ALPHA = 0.28;
const MAX_SPEED = 0.25;

/*
 * The canvas covers the whole page and scrolls with it (shapes are spread over
 * the full height). iOS Safari only draws scrolling page content under its
 * status bar and toolbar, never fixed or sticky elements, so this is what lets
 * the shapes reach every edge of the screen.
 */
export default function CanvasBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animId = useRef<number | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        let redraw: (() => void) | null = null;
        const rnd = (min: number, max: number) => Math.random() * (max - min) + min;
        const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

        const shapes: Shape[] = [];
        const newShape = (): Shape => ({
            x: rnd(0, w),
            y: rnd(0, h),
            size: rnd(24, 60),
            vx: rnd(-MAX_SPEED, MAX_SPEED),
            vy: rnd(-MAX_SPEED, MAX_SPEED),
            rotation: rnd(0, Math.PI * 2),
            vr: rnd(-0.003, 0.003),
            type: Math.random() < 0.5 ? "triangle" : "rect",
            colorA: pick(NEON),
            colorB: pick(NEON),
        });

        // w/h are CSS pixels (the whole page); the bitmap is scaled up for
        // sharp retina rendering, within what the browser allows
        let w = 0;
        let h = 0;
        const resize = () => {
            w = canvas.clientWidth;
            h = canvas.clientHeight;
            if (!w || !h) return;
            const dpr = Math.min(
                window.devicePixelRatio || 1,
                2,
                Math.sqrt(MAX_CANVAS_PIXELS / (w * h)),
            );
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            // keep the density constant as the page gets taller or shorter
            const target = Math.min(
                MAX_SHAPES,
                Math.max(SHAPES_PER_SCREEN, Math.round((SHAPES_PER_SCREEN * h) / window.innerHeight)),
            );
            while (shapes.length < target) shapes.push(newShape());
            shapes.length = target;
            shapes.forEach((s) => {
                s.x = Math.min(s.x, w);
                s.y = Math.min(s.y, h);
            });
            redraw?.();
        };
        resize();
        // the page height changes as content loads or the window resizes
        const observer = new ResizeObserver(resize);
        observer.observe(canvas);

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
            // transparent canvas: the page's own background shows through, so
            // there's exactly one black (a painted canvas black can render a
            // shade off from the CSS one in Safari)
            ctx.clearRect(0, 0, w, h);
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
                if (s.x > w) s.vx = -Math.abs(s.vx);
                if (s.y < 0) s.vy = Math.abs(s.vy);
                if (s.y > h) s.vy = -Math.abs(s.vy);
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
            observer.disconnect();
        };
    }, []);

    return (
        <div className="background-holder" aria-hidden="true">
            <canvas ref={canvasRef} className="background-canvas" />
        </div>
    );
}
