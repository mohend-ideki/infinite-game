import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";
import { effectsBus } from "../../effects/effectsBus";
import { getGameState } from "../../store/gameStore";

const PARTICLE_COUNT = 260;
const PER_BURST = 18;
const PARTICLE_LIFE = 0.65;
const GRAVITY = 9;
const DAMPING = 2.4;

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  life: number;
}

export function PostFx({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <EffectComposer multisampling={2}>
      <Bloom
        intensity={reducedMotion ? 0.5 : 1.05}
        luminanceThreshold={0.2}
        luminanceSmoothing={0.85}
        mipmapBlur
        radius={0.7}
      />
    </EffectComposer>
  );
}

export function ParticleBursts() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: PARTICLE_COUNT }, () => ({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        color: new THREE.Color(),
        life: 0,
      })),
    [],
  );
  const cursor = useRef(0);

  useEffect(() => {
    return effectsBus.on("burst", ({ position, color, rare }) => {
      if (getGameState().settings.reducedMotion) {
        return;
      }
      const count = rare ? PER_BURST + 10 : PER_BURST;
      tmpColor.set(color);
      for (let i = 0; i < count; i++) {
        const particle = particles[cursor.current];
        cursor.current = (cursor.current + 1) % PARTICLE_COUNT;
        particle.position.set(position[0], position[1], position[2]);
        const speed = 3 + Math.random() * 5;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        particle.velocity.set(
          Math.sin(phi) * Math.cos(theta),
          Math.abs(Math.cos(phi)) + 0.4,
          Math.sin(phi) * Math.sin(theta),
        ).multiplyScalar(speed);
        particle.color.copy(tmpColor);
        particle.life = PARTICLE_LIFE;
      }
    });
  }, [particles, tmpColor]);

  useFrame((_state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) {
      return;
    }
    const dt = Math.min(delta, 0.05);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const particle = particles[i];
      if (particle.life > 0) {
        particle.life -= dt;
        particle.velocity.y -= GRAVITY * dt;
        particle.velocity.multiplyScalar(1 - DAMPING * dt);
        particle.position.addScaledVector(particle.velocity, dt);
        const scale = Math.max(0, particle.life / PARTICLE_LIFE) * 0.32;
        dummy.position.copy(particle.position);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, particle.color);
      } else {
        dummy.position.set(0, -1000, 0);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} />
      <meshBasicMaterial toneMapped={false} blending={THREE.AdditiveBlending} transparent depthWrite={false} />
    </instancedMesh>
  );
}
