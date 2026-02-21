import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

interface VRMViewerProps {
    mood: 'idle' | 'thinking' | 'speaking' | 'scared';
}

const humanTextMap: Record<VRMViewerProps['mood'], string[]> = {
    thinking: [
        "Egy pillanat... próbálom átlátni.",
        "Ez érdekes kérdés. Hadd gondolkodjak rajta.",
        "Hmm... több lehetőség is van itt.",
        "Várj egy kicsit, összeáll a kép.",
        "Nem teljesen triviális... de megoldjuk."
    ],
    speaking: [
        "Figyelek rád.",
        "Mesélj még egy kicsit.",
        "Értem. Pontosítsunk egy picit.",
        "Oké, nézzük meg együtt.",
        "Ez izgalmas irány."
    ],
    scared: [
        "Várj... ezt most komolyan?",
        "Ez meglepett.",
        "Hmm... erre nem számítottam.",
        "Ez váratlan fordulat.",
        "Oké, ez most gyors volt."
    ],
    idle: [""]
};

const fillers = ["Hmm...", "Ööö...", "Nos...", "Lássuk csak...", "Oké..."];

function humanize(text: string, mood: VRMViewerProps['mood']) {
    let result = text;
    if (Math.random() < 0.4 && mood !== "scared") {
        const filler = fillers[Math.floor(Math.random() * fillers.length)];
        result = filler + " " + result;
    }
    if (Math.random() < 0.25) result += " ...";
    if (Math.random() < 0.15) result += " Igen, így lesz jó.";
    return result;
}


const VRMModel: React.FC<{ mood: VRMViewerProps['mood'] }> = ({ mood }) => {
    const [vrm, setVrm] = useState<VRM | null>(null);
    const clock = useRef(new THREE.Clock());

    const [displayText, setDisplayText] = useState("");
    const [isVisible, setIsVisible] = useState(false);
    const [isTyping, setIsTyping] = useState(false);

    const fadeTimeoutRef = useRef<any>(null);
    const intervalRef = useRef<any>(null);
    const lastMoodRef = useRef<string>("");
    const lastTextRef = useRef<string>("");

    const typingSpeed = useMemo(() => {
        switch (mood) {
            case "thinking": return 55;
            case "speaking": return 35;
            case "scared": return 28;
            default: return 40;
        }
    }, [mood]);

    useEffect(() => {
        if (mood === lastMoodRef.current) return;
        lastMoodRef.current = mood;

        if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
        if (intervalRef.current) clearInterval(intervalRef.current);

        const options = humanTextMap[mood];
        
        if (options && options[0] !== "") {
            let baseText = "";
            do {
                baseText = options[Math.floor(Math.random() * options.length)];
            } while (baseText === lastTextRef.current && options.length > 1);
            
            lastTextRef.current = baseText;
            const humanText = humanize(baseText, mood);

            setDisplayText("");
            setIsVisible(true);
            setIsTyping(true);

            let i = 0;
            intervalRef.current = setInterval(() => {
                setDisplayText(humanText.slice(0, i));
                i++;

                if (i > humanText.length) {
                    clearInterval(intervalRef.current);
                    setIsTyping(false);
                    
                    const visibleDuration = 60000 + Math.min(humanText.length * 150, 15000);
                    fadeTimeoutRef.current = setTimeout(() => {
                        setIsVisible(false);
                    }, visibleDuration);
                }
            }, typingSpeed);

        } else {
            setIsVisible(false);
            setIsTyping(false);
        }

        return () => {
            if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [mood, typingSpeed]);

    useEffect(() => {
        const loader = new GLTFLoader();
        loader.register((parser) => new VRMLoaderPlugin(parser));
        
        const path = mood === 'scared' ? '/Mia_Scared.vrm' : '/Mia_Neutral.vrm';
        
        loader.load(path, (gltf) => {
            const vrmModel = gltf.userData.vrm as VRM;
            VRMUtils.rotateVRM0(vrmModel);
            setVrm(vrmModel);
        });

        return () => { if (vrm) VRMUtils.deepDispose(vrm.scene); };
    }, [mood === 'scared']);

    useFrame((state) => {
        const delta = clock.current.getDelta();
        const t = state.clock.getElapsedTime();
        if (!vrm) return;

        vrm.update(delta);

        if (vrm.expressionManager) {
            vrm.expressionManager.expressions.forEach(e => {
                if (e.expressionName !== 'blink') e.weight = 0;
            });

            if (mood === 'thinking') vrm.expressionManager.setValue('neutral', 0.8);
            else if (mood === 'scared') vrm.expressionManager.setValue('surprised', 1);
            else if (mood === 'speaking') vrm.expressionManager.setValue('happy', 0.4);

            if (isTyping) {
                const mouthOpen = Math.abs(Math.sin(t * 12)) * 0.35;
                vrm.expressionManager.setValue('aa', mouthOpen);
            }
            vrm.expressionManager.update();
        }

        const head = vrm.humanoid?.getRawBoneNode('head');
        if (head) {
            head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, state.mouse.x * 1, 0.3);
            head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, -state.mouse.y * 1, 0.3);
        }

        const leftUpperArm = vrm.humanoid?.getRawBoneNode('leftUpperArm');
        const rightUpperArm = vrm.humanoid?.getRawBoneNode('rightUpperArm');
        if (leftUpperArm && rightUpperArm) {
            leftUpperArm.rotation.z = -1.2 + Math.sin(t * 0.6) * 0.04;
            rightUpperArm.rotation.z = 1.2 - Math.sin(t * 0.6) * 0.04;
        }
        vrm.scene.position.y = -1.4 + Math.sin(t * 0.8) * 0.015;
    });

    useEffect(() => {
        if (!vrm) return;
        let tId: any;
        const blink = () => {
            vrm.expressionManager?.setValue('blink', 1);
            vrm.expressionManager?.update();
            setTimeout(() => {
                vrm.expressionManager?.setValue('blink', 0);
                vrm.expressionManager?.update();
                tId = setTimeout(blink, Math.random() * 4000 + 2000);
            }, 150);
        };
        blink();
        return () => clearTimeout(tId);
    }, [vrm]);

    return (
        <group>
            {vrm && <primitive object={vrm.scene} />}
            {isVisible && displayText && (
                <Html position={[0.1, 0.5, 0]} center>
                    <div
                        className={`
                            relative w-[180px] max-w-[90vw]
                            bg-gradient-to-br from-slate-800/95 via-slate-800/90 to-slate-900/95
                            backdrop-blur-xl
                            border border-white/15
                            shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.05)_inset]
                            p-3.5
                            rounded-2xl rounded-bl-md
                            transition-all duration-500 ease-out origin-bottom-left
                            ${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-1'}
                            pointer-events-none select-none
                        `}
                        style={{
                            boxShadow: '0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06) inset, 0 2px 8px rgba(0,0,0,0.2)',
                        }}
                    >
                        <p className="text-slate-100 font-medium text-[11px] leading-[1.45] break-words tracking-tight">
                            {displayText}
                            {isTyping && (
                                <span
                                    className="inline-block w-0.5 h-3.5 bg-cyan-400/90 ml-1 rounded-full animate-pulse align-middle"
                                    style={{ animationDuration: '0.8s' }}
                                />
                            )}
                        </p>
                        <div
                            className="absolute left-0 bottom-0 w-0 h-0 border-y-[6px] border-r-[10px] border-y-transparent border-r-slate-800/95"
                            style={{ filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.2))' }}
                        />
                    </div>
                </Html>
            )}
        </group>
    );
};

export const VRMViewer: React.FC<VRMViewerProps> = ({ mood }) => {
    return (
        <div className="w-full h-full bg-[#050505] border-l border-white/5 relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,#2a2015_0%,transparent_70%)] opacity-60" />
            <Canvas camera={{ position: [0, 1.0, 3], fov: 32 }} dpr={[1, 2]}>
                <ambientLight intensity={0.6} color="#fff5e6" />
                <spotLight position={[2, 4, 3]} intensity={2.8} color="#ffcc80" />
                <pointLight position={[-2, 1, 2]} intensity={1.2} color="#ffe0b2" />
                <pointLight position={[0, 2, -2]} intensity={2} color="#ffffff" />
                <VRMModel mood={mood} />
            </Canvas>
            <div className="absolute bottom-6 right-6 flex items-center gap-2">
            </div>
        </div>
    );
};