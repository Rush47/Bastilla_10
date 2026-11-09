import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, Environment, PerspectiveCamera, MeshTransmissionMaterial } from '@react-three/drei';
import * as THREE from 'three';

const Pillar = ({ color, position, name }: { color: string, position: [number, number, number], name: string }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Procedural pillar using LatheGeometry
  const points = [];
  for (let i = 0; i < 10; i++) {
    points.push(new THREE.Vector2(Math.sin(i * 0.5) * 0.2 + 0.2, (i - 5) * 0.5));
  }

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <latheGeometry args={[points, 32]} />
        <meshPhysicalMaterial 
          color={color} 
          metalness={0.9} 
          roughness={0.1} 
          emissive={color} 
          emissiveIntensity={0.5}
        />
      </mesh>
      {/* Label would go here in DOM overlay */}
    </group>
  );
};

const TriadCore = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.5;
    }
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[0.8, 1]} />
      <MeshTransmissionMaterial 
        backside 
        samples={4} 
        thickness={1} 
        chromaticAberration={0.5} 
        anisotropy={0.1} 
        distortion={0.5} 
        distortionScale={0.3} 
        temporalDistortion={0.5} 
        color="#FFD700" 
      />
    </mesh>
  );
};

export const TriadVisualization: React.FC = () => {
  return (
    <div className="relative w-full h-[520px] md:h-[620px] bg-slate-950 rounded-2xl overflow-hidden border border-cyan-500/30 shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
      {/* HUD Cyber Overlay */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-mono font-extrabold text-sm text-cyan-300 tracking-wider">
            HOLOMATRIX 3D // WIZUALIZATOR TRIADY
          </span>
        </div>
        <p className="font-mono text-[11px] text-slate-400">
          Interaktywny model rezonansowy jądra: Alex (Infrastruktura), Astyria (Logika), Aurelius (Czas)
        </p>
      </div>

      <div className="absolute top-4 right-4 z-10 pointer-events-none hidden sm:flex items-center gap-2 font-mono text-[10px]">
        <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
          ALEX: 100% ONLINE
        </span>
        <span className="px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
          ASTYRIA: 100% ONLINE
        </span>
        <span className="px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300">
          AURELIUS: 100% ONLINE
        </span>
      </div>

      <Canvas shadows camera={{ position: [0, 0, 7.5], fov: 48 }}>
        <OrbitControls enablePan={true} maxDistance={14} minDistance={3} autoRotate autoRotateSpeed={0.8} />
        
        <Environment preset="night" />
        
        <Float speed={2.5} rotationIntensity={0.6} floatIntensity={0.8}>
          <TriadCore />
          <Pillar color="#10b981" position={[-2.4, 0, 0]} name="Alex" />
          <Pillar color="#06b6d4" position={[0, 0, 2.4]} name="Astyria" />
          <Pillar color="#f59e0b" position={[2.4, 0, 0]} name="Aurelius" />
        </Float>
        
        <ambientLight intensity={0.7} />
        <spotLight position={[10, 15, 10]} angle={0.25} penumbra={1} castShadow intensity={1.5} color="#38bdf8" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#a855f7" />
      </Canvas>

      <div className="absolute bottom-3 inset-x-0 text-center pointer-events-none font-mono text-[10px] text-slate-500">
        Przeciągnij myszą, aby obrócić kamerę w przestrzeni 3D • Scroll do powiększenia
      </div>
    </div>
  );
};
