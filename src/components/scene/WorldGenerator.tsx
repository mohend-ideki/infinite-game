import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { BallCollider, RigidBody, type IntersectionEnterPayload } from "@react-three/rapier";
import * as THREE from "three";
import { themeConfig } from "../../config/themeConfig";
import {
  gameActions,
  getGameState,
  isMagnetActive,
  playerPosition,
  type PowerupType,
} from "../../store/gameStore";
import { sound } from "../../audio/sound";
import { effectsBus, haptic } from "../../effects/effectsBus";
import { PLAYER_HEIGHT, TRACK_HALF_WIDTH } from "./Player";

const CHUNK_LENGTH = 30;
const CHUNKS_AHEAD = 5;
const CHUNKS_BEHIND = 1;
const SLOTS_PER_CHUNK = 5;
const LANES = [-3, 0, 3] as const;

const ITEM_Y = PLAYER_HEIGHT;
const BONUS_RADIUS = 0.85;
const RARE_VALUE = 6;
const COMMON_VALUE = 1;
const DANGER_COLOR = "#ff2d55";

const MAGNET_RADIUS = 11;
const MAGNET_COLLECT_DIST = 0.9;
const POWERUP_TYPES: PowerupType[] = ["shield", "magnet", "slowmo"];

type ItemKind = "bonus" | "malus" | "power";

interface ChunkItem {
  id: string;
  position: [number, number, number];
  kind: ItemKind;
  value: number;
  rare: boolean;
  power?: PowerupType;
}

/** PRNG déterministe (mulberry32) : un index de chunk produit toujours le même tracé. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Probabilité d'objets rares : croît légèrement avec la distance. */
function rareProbability(distance: number): number {
  return Math.min(0.45, 0.05 + distance * 0.0009);
}

/** Courbe de difficulté : densité d'objets et proportion de malus montent avec la distance. */
function spawnProbability(distance: number): number {
  return Math.min(0.85, 0.55 + distance * 0.0004);
}

function malusProbability(distance: number): number {
  return Math.min(0.55, 0.38 + distance * 0.0006);
}

function powerupProbability(distance: number): number {
  return Math.min(0.18, 0.06 + distance * 0.0002);
}

function generateChunkItems(index: number): ChunkItem[] {
  if (index < 1) {
    return [];
  }

  const random = mulberry32(index * 2654435761 + 40503);
  const z0 = index * CHUNK_LENGTH;
  const pRare = rareProbability(z0);
  const pSpawn = spawnProbability(z0);
  const pMalus = malusProbability(z0);
  const pPower = powerupProbability(z0);
  const slotLength = CHUNK_LENGTH / SLOTS_PER_CHUNK;
  const items: ChunkItem[] = [];

  for (let slot = 0; slot < SLOTS_PER_CHUNK; slot++) {
    if (random() > pSpawn) {
      continue;
    }

    const z = z0 + (slot + 0.5) * slotLength;
    const laneIndex = Math.min(LANES.length - 1, Math.floor(random() * LANES.length));
    const x = LANES[laneIndex];
    const id = `${index}-${slot}`;

    if (random() < pMalus) {
      items.push({ id, position: [x, ITEM_Y, z], kind: "malus", value: 0, rare: false });
      continue;
    }

    if (random() < pPower) {
      const power = POWERUP_TYPES[Math.min(POWERUP_TYPES.length - 1, Math.floor(random() * POWERUP_TYPES.length))];
      items.push({ id, position: [x, ITEM_Y, z], kind: "power", value: 0, rare: false, power });
      continue;
    }

    const rare = random() < pRare;
    items.push({
      id,
      position: [x, ITEM_Y, z],
      kind: "bonus",
      value: rare ? RARE_VALUE : COMMON_VALUE,
      rare,
    });
  }

  return items;
}

function isPlayer(payload: IntersectionEnterPayload): boolean {
  const data = payload.other.rigidBodyObject?.userData as { type?: string } | undefined;
  return data?.type === "player";
}

function powerColor(power: PowerupType): string {
  if (power === "shield") {
    return themeConfig.colors.primary;
  }
  if (power === "magnet") {
    return themeConfig.colors.secondary;
  }
  return themeConfig.colors.accent;
}

function Item({ item }: { item: ChunkItem }) {
  const [consumed, setConsumed] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  const basePos = useMemo(
    () => new THREE.Vector3(item.position[0], item.position[1], item.position[2]),
    [item.position],
  );
  const offset = useRef(new THREE.Vector3());
  const worldPos = useRef(new THREE.Vector3());

  const isBonus = item.kind === "bonus";
  const isPower = item.kind === "power";
  const color = isPower
    ? powerColor(item.power as PowerupType)
    : isBonus
      ? item.rare
        ? themeConfig.colors.secondary
        : themeConfig.colors.accent
      : DANGER_COLOR;

  const collectBonusEffects = () => {
    const combo = getGameState().combo;
    gameActions.collectBonus(item.value);
    if (item.rare) {
      sound.rarePickup();
    } else {
      sound.pickup(combo);
    }
    worldPos.current.copy(basePos).add(offset.current);
    effectsBus.emit("burst", {
      position: [worldPos.current.x, worldPos.current.y, worldPos.current.z],
      color,
      rare: item.rare,
    });
    haptic(item.rare ? 30 : 12);
    setConsumed(true);
  };

  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * (isBonus ? 1.6 : isPower ? 2.2 : 0.8);
      meshRef.current.rotation.x += delta * 0.5;
    }

    // Attraction par l'aimant : seuls les bonus volent vers le joueur.
    if (isBonus && !consumed && isMagnetActive()) {
      worldPos.current.copy(basePos).add(offset.current);
      const distance = worldPos.current.distanceTo(playerPosition);
      if (distance < MAGNET_RADIUS) {
        const pull = 1 - Math.pow(0.0001, delta);
        offset.current.x += (playerPosition.x - worldPos.current.x) * pull;
        offset.current.y += (playerPosition.y - worldPos.current.y) * pull;
        offset.current.z += (playerPosition.z - worldPos.current.z) * pull;
        if (meshRef.current) {
          meshRef.current.position.copy(offset.current);
        }
        if (distance < MAGNET_COLLECT_DIST) {
          collectBonusEffects();
        }
      }
    }
  });

  if (consumed) {
    return null;
  }

  const handleEnter = (payload: IntersectionEnterPayload) => {
    if (!isPlayer(payload)) {
      return;
    }
    if (isBonus) {
      collectBonusEffects();
      return;
    }
    if (isPower && item.power) {
      gameActions.activatePowerup(item.power);
      sound.powerup();
      effectsBus.emit("burst", { position: item.position, color, rare: true });
      haptic(25);
      setConsumed(true);
      return;
    }
    // Malus
    const blocked = gameActions.hitMalus();
    if (blocked) {
      sound.shieldBlock();
      effectsBus.emit("burst", {
        position: item.position,
        color: themeConfig.colors.primary,
        rare: true,
      });
      haptic(15);
    } else {
      sound.malus();
      effectsBus.emit("shake", { intensity: 1 });
      haptic([20, 40, 20]);
    }
    setConsumed(true);
  };

  return (
    <RigidBody
      type="fixed"
      colliders={false}
      sensor
      position={item.position}
      onIntersectionEnter={handleEnter}
    >
      <BallCollider args={[isPower ? 0.95 : BONUS_RADIUS]} sensor />
      {isBonus ? (
        <mesh ref={meshRef} castShadow>
          <octahedronGeometry args={[item.rare ? 0.7 : 0.55, 0]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={item.rare ? 1.6 : 1.0}
            roughness={0.15}
            metalness={0.4}
            toneMapped={false}
          />
        </mesh>
      ) : isPower ? (
        <mesh ref={meshRef} castShadow>
          <torusGeometry args={[0.55, 0.18, 12, 28]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={1.6}
            roughness={0.2}
            metalness={0.5}
            toneMapped={false}
          />
        </mesh>
      ) : (
        <mesh ref={meshRef} castShadow>
          <boxGeometry args={[1.2, 1.6, 1.2]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.6}
            roughness={0.4}
            metalness={0.1}
            transparent
            opacity={0.85}
          />
        </mesh>
      )}
      <pointLight color={color} intensity={isBonus ? 3 : isPower ? 4 : 2} distance={6} decay={2} />
    </RigidBody>
  );
}

function Chunk({ index }: { index: number }) {
  const items = useMemo(() => generateChunkItems(index), [index]);
  const centerZ = index * CHUNK_LENGTH + CHUNK_LENGTH / 2;
  const floorWidth = TRACK_HALF_WIDTH * 2 + 1.5;
  const railX = TRACK_HALF_WIDTH + 0.5;

  // Barres lumineuses transversales : repères de vitesse au sol.
  const speedBars = useMemo(() => {
    const bars: number[] = [];
    const count = 3;
    for (let i = 0; i < count; i++) {
      bars.push(index * CHUNK_LENGTH + (i + 0.5) * (CHUNK_LENGTH / count));
    }
    return bars;
  }, [index]);

  return (
    <group>
      <mesh receiveShadow position={[0, -0.25, centerZ]}>
        <boxGeometry args={[floorWidth, 0.5, CHUNK_LENGTH]} />
        <meshStandardMaterial
          color={themeConfig.colors.background}
          emissive={themeConfig.colors.primary}
          emissiveIntensity={index % 2 === 0 ? 0.04 : 0.08}
          roughness={0.85}
          metalness={0.15}
        />
      </mesh>

      {speedBars.map((z) => (
        <mesh key={z} position={[0, 0.02, z]}>
          <boxGeometry args={[floorWidth - 1, 0.04, 0.18]} />
          <meshStandardMaterial
            color={themeConfig.colors.primary}
            emissive={themeConfig.colors.primary}
            emissiveIntensity={0.6}
            toneMapped={false}
          />
        </mesh>
      ))}

      <mesh position={[-railX, 0.1, centerZ]}>
        <boxGeometry args={[0.2, 0.7, CHUNK_LENGTH]} />
        <meshStandardMaterial
          color={themeConfig.colors.primary}
          emissive={themeConfig.colors.primary}
          emissiveIntensity={0.9}
          roughness={0.3}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[railX, 0.1, centerZ]}>
        <boxGeometry args={[0.2, 0.7, CHUNK_LENGTH]} />
        <meshStandardMaterial
          color={themeConfig.colors.primary}
          emissive={themeConfig.colors.primary}
          emissiveIntensity={0.9}
          roughness={0.3}
          toneMapped={false}
        />
      </mesh>

      {items.map((item) => (
        <Item key={item.id} item={item} />
      ))}
    </group>
  );
}

function buildRange(current: number): number[] {
  const range: number[] = [];
  for (let i = current - CHUNKS_BEHIND; i <= current + CHUNKS_AHEAD; i++) {
    range.push(i);
  }
  return range;
}

function sameRange(a: number[], b: number[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

export function WorldGenerator() {
  const [chunks, setChunks] = useState<number[]>(() => buildRange(0));
  const activeRef = useRef<number[]>(chunks);

  useFrame(() => {
    const current = Math.floor(playerPosition.z / CHUNK_LENGTH);
    const next = buildRange(current);
    if (!sameRange(next, activeRef.current)) {
      activeRef.current = next;
      setChunks(next);
    }
  });

  return (
    <>
      {chunks.map((index) => (
        <Chunk key={index} index={index} />
      ))}
    </>
  );
}
