import React, { useRef, useEffect } from 'react';
import { interpolateRgb } from 'd3-interpolate';
import { drawGlassReflections } from '../engine/LiquidRenderer';
import useLabStore from '../../../store/useLabStore';
import { CHEMISTRY_DATABASE } from '../../../constants/chemistryData';
import { getMixtureVisualProfile } from '../../../utils/chemicalColorSystem';

export default function Burette2D({
    id = "burette1",
    width = 40,
    height = 250,
    onValveChange,
    onDrop
}) {
    const canvasRef = useRef(null);
    const dropRef = useRef(null);
    const currentColorRef = useRef(null);
    const mixture = useLabStore(state => state.containers?.[id]);
    const isOpen = mixture?.isOpen;

    // Titration dripping logic
    useEffect(() => {
        if (!isOpen || mixture?.volume <= 0) return;

        // Fire a drop event every 300ms if open
        const interval = setInterval(() => {
            if (onDrop && mixture?.volume > 0) {
                onDrop(1); // 1mL per drop
            }
        }, 300);

        return () => clearInterval(interval);
    }, [isOpen, mixture, onDrop]);

    // Canvas Rendering Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        const dCanvas = dropRef.current;
        const dCtx = dCanvas?.getContext('2d');
        if (!ctx || !dCtx) return;
        let animationFrameId;
        let time = 0;

        const maxVol = mixture?.maxCapacity || 50;
        const currentVol = Math.max(0, Math.min(mixture?.volume || 0, maxVol));
        const fillRatio = currentVol / maxVol;
        const targetColor = mixture?.color || "rgba(255,255,255,0)";
        const visualProfile = getMixtureVisualProfile((mixture?.components || []).map((component) => ({
            volume: component.volume,
            data: CHEMISTRY_DATABASE[component.id]
        })));

        // Setup initial color state to avoid jump on first load
        if (!currentColorRef.current) {
            currentColorRef.current = targetColor;
        }

        const render = () => {
            if (!canvasRef.current) return;
            time++;

            // Smoothly lerp towards targetColor
            if (currentColorRef.current !== targetColor) {
                currentColorRef.current = interpolateRgb(currentColorRef.current, targetColor)(0.03); // Approx 500-1000ms transition
            }
            const color = currentColorRef.current;

            ctx.clearRect(0, 0, width, height);

            // Tube glass backdrop
            ctx.fillStyle = "rgba(255,255,255,0.03)";
            ctx.fillRect(8, 0, width - 16, height - 30);

            // Draw Liquid inside tube
            if (fillRatio > 0) {
                const liqH = fillRatio * (height - 40);
                const liqY = (height - 30) - liqH;

                ctx.save();
                ctx.shadowBlur = 10;
                ctx.shadowColor = visualProfile.glow;
                const liquidGradient = ctx.createLinearGradient(0, liqY, 0, liqY + liqH);
                liquidGradient.addColorStop(0, visualProfile.top);
                liquidGradient.addColorStop(0.5, color);
                liquidGradient.addColorStop(1, visualProfile.bottom);
                ctx.fillStyle = liquidGradient;
                ctx.fillRect(10, liqY, width - 20, liqH);

                // Meniscus wave (tiny for burette)
                ctx.beginPath();
                ctx.moveTo(10, liqY);
                for (let x = 10; x <= width - 10; x++) {
                    ctx.lineTo(x, liqY + Math.sin(x * 0.5 + time * 0.1) * 1);
                }
                ctx.lineTo(width - 10, liqY + 5);
                ctx.lineTo(10, liqY + 5);
                ctx.shadowBlur = 0;
                ctx.fillStyle = "rgba(255,255,255,0.2)";
                ctx.fill();
                ctx.restore();
            }

            // Draw markings
            ctx.fillStyle = "rgba(255,255,255,0.4)";
            ctx.font = "8px monospace";
            for (let i = 10; i <= 50; i += 10) {
                const tickY = (i / 50) * (height - 40) + 10; // Read from top down
                ctx.fillRect(10, tickY, 8, 1);
                if (i % 20 === 0) ctx.fillText(i, 20, tickY + 3);
            }

            // Stopcock Valve area
            ctx.fillStyle = "rgba(100,100,100,0.8)";
            ctx.fillRect(5, height - 30, width - 10, 15);
            ctx.fillStyle = "rgba(100,200,255,0.4)"; // Glass tip
            ctx.beginPath();
            ctx.moveTo(15, height - 15);
            ctx.lineTo(25, height - 15);
            ctx.lineTo(22, height);
            ctx.lineTo(18, height);
            ctx.closePath();
            ctx.fill();

            drawGlassReflections(ctx, 8, 0, width - 16, height - 30);

            ctx.strokeStyle = "rgba(255,255,255,0.15)";
            ctx.lineWidth = 1;
            ctx.strokeRect(8, 0, width - 16, height - 30);

            // Render Dropping Animation
            dCtx.clearRect(0, 0, 40, 80);
            if (isOpen && currentVol > 0) {
                // simple drop falling
                const dropY = (time * 4) % 80;
                dCtx.save();
                dCtx.shadowBlur = 8;
                dCtx.shadowColor = visualProfile.glow;
                dCtx.fillStyle = visualProfile.mid;
                dCtx.beginPath();
                dCtx.arc(20, dropY, 3, 0, Math.PI * 2);
                dCtx.moveTo(17, dropY);
                dCtx.lineTo(20, dropY - 8);
                dCtx.lineTo(23, dropY);
                dCtx.fill();
                dCtx.restore();
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animationFrameId);
    }, [mixture, width, height, isOpen]);

    return (
        <div className="relative flex flex-col items-center">
            {/* The tall burette canvas */}
            <canvas ref={canvasRef} width={width} height={height} className="pointer-events-none drop-shadow-xl" />

            {/* The overlapping dropping path below the burette tip */}
            <canvas ref={dropRef} width="40" height="80" className="absolute -bottom-20 pointer-events-none" />

            {/* Valve handle control */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onValveChange();
                }}
                className="absolute z-[110] cursor-pointer"
                style={{ top: height - 35, right: -15 }}
            >
                <div className={`w-10 h-3 rounded-full transition-transform duration-300 ${isOpen ? 'bg-neon-green rotate-90' : 'bg-red-500 hover:bg-red-400 rotate-0 border border-white/50'}`} style={{ boxShadow: isOpen ? '0 0 15px rgba(34,211,238,0.6)' : '0 0 10px rgba(255,0,0,0.5)' }}></div>
            </button>

            <div className="mt-24 text-[10px] font-mono text-neon-cyan tracking-widest text-center px-2 py-1 bg-black/50 rounded">
                BURETTE<br />
                {(mixture?.volume || 0).toFixed(1)}mL
            </div>
        </div>
    );
}
