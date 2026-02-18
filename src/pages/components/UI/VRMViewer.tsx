import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import * as THREE from 'three';

interface VRMViewerProps {
    mood: 'idle' | 'thinking' | 'speaking' | 'scared';
}

const VRMModel: React.FC<{ mood: VRMViewerProps['mood'] }> = ({ mood }) => {
    const [vrm, setVrm] = useState<VRM | null>(null);
    const mixerRef = useRef<THREE.AnimationMixer | null>(null);
    const clock = useRef(new THREE.Clock());

    useEffect(() => {
        const loader = new GLTFLoader();
        loader.register((parser) => new VRMLoaderPlugin(parser));
        
        loader.load(mood === 'scared' ? '/Mia_Scared.vrm' : '/Mia_Neutral.vrm', (gltf) => {
            const vrmModel = gltf.userData.vrm as VRM;
            VRMUtils.rotateVRM0(vrmModel);
            
            if (gltf.animations?.length) {
                const mixer = new THREE.AnimationMixer(vrmModel.scene);
                mixerRef.current = mixer;
                mixer.clipAction(gltf.animations[0]).play();
            }
            setVrm(vrmModel);
        });

        return () => { if (vrm) VRMUtils.deepDispose(vrm.scene); };
    }, [mood]);

    useEffect(() => {
        if (!vrm) return;
        let timeoutId: any;

        const blink = () => {
            const em = vrm.expressionManager;
            if (!em) return;

            em.setValue('blink', 1);
            em.update();

            setTimeout(() => {
                em.setValue('blink', 0);
                em.update();
                timeoutId = setTimeout(blink, Math.random() * 4000 + 2000);
            }, 150);
        };

        blink();
        return () => clearTimeout(timeoutId);
    }, [vrm]);

    useFrame((state) => {
        const delta = clock.current.getDelta();
        const t = state.clock.getElapsedTime();

        if (mixerRef.current) mixerRef.current.update(delta);
        
        if (vrm) {
            vrm.update(delta);

            const leftUpperArm = vrm.humanoid?.getRawBoneNode('leftUpperArm');
            const rightUpperArm = vrm.humanoid?.getRawBoneNode('rightUpperArm');
            
            if (leftUpperArm && rightUpperArm) {
                leftUpperArm.rotation.z = -1.2 + Math.sin(t * 0.5) * 0.02;
                rightUpperArm.rotation.z = 1.2 - Math.sin(t * 0.5) * 0.02;
            }

            const head = vrm.humanoid?.getRawBoneNode('head');
            if (head) {
                head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, state.mouse.x * 0.4, 0.1);
                head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, -state.mouse.y * 0.2, 0.1);
            }

            vrm.scene.position.y = -1.4 + Math.sin(t * 0.8) * 0.01;
        }
    });

    useEffect(() => {
        if (!vrm) return;
        const em = vrm.expressionManager;
        if (em) {
            em.expressions.forEach(e => e.weight = 0);
            if (mood === 'thinking') (em.getExpression('thinking') || em.getExpression('angry'))!.weight = 1;
            else if (mood === 'speaking') em.getExpression('aa')!.weight = 0.5;
            else if (mood === 'scared') (em.getExpression('scared') || em.getExpression('surprised'))!.weight = 1;
            else em.getExpression('neutral')!.weight = 1;
            em.update();
        }
    }, [vrm, mood]);

    return vrm ? <primitive object={vrm.scene} /> : null;
};

export const VRMViewer: React.FC<VRMViewerProps> = ({ mood }) => {
    return (
        <div className="w-full h-full bg-[#050505] border-l border-white/5 relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,#2a2015_0%,transparent_70%)] opacity-60" />
            
            <Canvas camera={{ position: [0, 1.3, 2.3], fov: 32 }} dpr={[1, 2]}>
                <ambientLight intensity={0.6} color="#fff5e6" />
                
                <spotLight 
                    position={[2, 4, 3]} 
                    intensity={2.8} 
                    angle={0.4} 
                    penumbra={1} 
                    color="#ffcc80" 
                    castShadow 
                />
                
                <pointLight 
                    position={[-2, 1, 2]} 
                    intensity={1.2} 
                    color="#ffe0b2" 
                />
                
                <pointLight 
                    position={[0, 2, -2]} 
                    intensity={2} 
                    color="#ffffff" 
                />

                <VRMModel mood={mood} />
            </Canvas>

            <div className="absolute bottom-6 right-6 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${mood === 'thinking' ? 'bg-orange-500 animate-pulse' : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'}`} />
                <span className="text-[10px] uppercase tracking-widest text-orange-200/40 font-bold italic">Neural Link: Warm Boot</span>
            </div>
        </div>
    );
};