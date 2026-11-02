/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PenEntity, DeskObstacle, Vector2D } from '../types/game';

export interface DeskBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CollisionEvent {
  pen1Id: string;
  pen2Id?: string;
  obstacleId?: string;
  intensity: number;
  material: 'plastic' | 'resin' | 'steel' | 'brass';
  point: Vector2D;
}

export function distance(a: Vector2D, b: Vector2D): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function normalize(v: Vector2D): Vector2D {
  const len = Math.hypot(v.x, v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function dot(a: Vector2D, b: Vector2D): number {
  return a.x * b.x + a.y * b.y;
}

export function cross2D(a: Vector2D, b: Vector2D): number {
  return a.x * b.y - a.y * b.x;
}

// Get the 4 corner points of a pen, accounting for real center-of-mass offset
export function getPenCorners(pen: PenEntity): Vector2D[] {
  const halfL = pen.stats.length / 2;
  const halfW = pen.stats.width / 2;
  const comOffset = (pen.stats.centerOfMassOffset || 0) * pen.stats.length;

  const cos = Math.cos(pen.angle);
  const sin = Math.sin(pen.angle);

  const u = { x: cos, y: sin }; // Along length (tip is +u)
  const n = { x: -sin, y: cos }; // Along width

  // Geometric center relative to Center of Mass
  const cx = pen.pos.x - u.x * comOffset;
  const cy = pen.pos.y - u.y * comOffset;

  return [
    { x: cx + u.x * halfL + n.x * halfW, y: cy + u.y * halfL + n.y * halfW }, // Front-Right
    { x: cx + u.x * halfL - n.x * halfW, y: cy + u.y * halfL - n.y * halfW }, // Front-Left
    { x: cx - u.x * halfL - n.x * halfW, y: cy - u.y * halfL - n.y * halfW }, // Back-Left
    { x: cx - u.x * halfL + n.x * halfW, y: cy - u.y * halfL + n.y * halfW }, // Back-Right
  ];
}

// Separating Axis Theorem (SAT) collision test between two pens
export function checkPenPenCollision(
  p1: PenEntity,
  p2: PenEntity
): { colliding: boolean; normal: Vector2D; depth: number; contactPoint: Vector2D } | null {
  const corners1 = getPenCorners(p1);
  const corners2 = getPenCorners(p2);

  const axes: Vector2D[] = [
    { x: Math.cos(p1.angle), y: Math.sin(p1.angle) },
    { x: -Math.sin(p1.angle), y: Math.cos(p1.angle) },
    { x: Math.cos(p2.angle), y: Math.sin(p2.angle) },
    { x: -Math.sin(p2.angle), y: Math.cos(p2.angle) },
  ];

  let minOverlap = Infinity;
  let smallestAxis: Vector2D = { x: 0, y: 0 };

  for (const axis of axes) {
    let min1 = Infinity;
    let max1 = -Infinity;
    for (const c of corners1) {
      const p = dot(c, axis);
      if (p < min1) min1 = p;
      if (p > max1) max1 = p;
    }

    let min2 = Infinity;
    let max2 = -Infinity;
    for (const c of corners2) {
      const p = dot(c, axis);
      if (p < min2) min2 = p;
      if (p > max2) max2 = p;
    }

    if (max1 < min2 || max2 < min1) {
      // Separating axis found
      return null;
    }

    const overlap = Math.min(max1 - min2, max2 - min1);
    if (overlap < minOverlap) {
      minOverlap = overlap;
      smallestAxis = axis;
    }
  }

  // Ensure normal points from p1 to p2
  const centerDiff = { x: p2.pos.x - p1.pos.x, y: p2.pos.y - p1.pos.y };
  if (dot(centerDiff, smallestAxis) < 0) {
    smallestAxis = { x: -smallestAxis.x, y: -smallestAxis.y };
  }

  // Approximate contact point as center of intersection
  const contactPoint = {
    x: (p1.pos.x + p2.pos.x) / 2,
    y: (p1.pos.y + p2.pos.y) / 2,
  };

  return {
    colliding: true,
    normal: smallestAxis,
    depth: minOverlap,
    contactPoint,
  };
}

// Moment of Inertia for real pen using actual mass and Parallel Axis Theorem for COM offset
export function getMomentOfInertia(pen: PenEntity): number {
  const m = pen.stats.mass; // normalized mass (e.g. 0.58 for 5.8g, 2.35 for 23.5g)
  const L = pen.stats.length;
  const W = pen.stats.width;
  const offset = (pen.stats.centerOfMassOffset || 0) * L;

  // I = (1/12) * m * (L^2 + W^2) + m * d^2
  const I_center = (1 / 12) * m * (L * L + W * W);
  return I_center + m * (offset * offset);
}

// Resolve realistic collision between two pens
export function resolvePenCollision(
  p1: PenEntity,
  p2: PenEntity,
  collision: { normal: Vector2D; depth: number; contactPoint: Vector2D }
): CollisionEvent {
  const { normal, depth, contactPoint } = collision;

  // Positional correction based on mass ratio (heavier pen budges less)
  const percent = 0.85;
  const slop = 0.2;
  const correctionMagnitude = Math.max(0, depth - slop) * percent;
  const totalMass = p1.stats.mass + p2.stats.mass;

  const m1Ratio = p2.stats.mass / totalMass;
  const m2Ratio = p1.stats.mass / totalMass;

  p1.pos.x -= normal.x * (correctionMagnitude * m1Ratio);
  p1.pos.y -= normal.y * (correctionMagnitude * m1Ratio);
  p2.pos.x += normal.x * (correctionMagnitude * m2Ratio);
  p2.pos.y += normal.y * (correctionMagnitude * m2Ratio);

  // Lever arms from Centers of Mass to contact point
  const r1 = { x: contactPoint.x - p1.pos.x, y: contactPoint.y - p1.pos.y };
  const r2 = { x: contactPoint.x - p2.pos.x, y: contactPoint.y - p2.pos.y };

  // Velocities at contact point
  const v1 = {
    x: p1.vel.x - p1.angularVel * r1.y,
    y: p1.vel.y + p1.angularVel * r1.x,
  };
  const v2 = {
    x: p2.vel.x - p2.angularVel * r2.y,
    y: p2.vel.y + p2.angularVel * r2.x,
  };

  const relativeVel = { x: v2.x - v1.x, y: v2.y - v1.y };
  const velAlongNormal = dot(relativeVel, normal);

  // Moving away: no impulse needed
  if (velAlongNormal > 0) {
    return {
      pen1Id: p1.id,
      pen2Id: p2.id,
      intensity: 0.1,
      material: p1.stats.material || 'plastic',
      point: contactPoint,
    };
  }

  // Restitution based on barrel material (brass/steel is slightly bouncier and crisper)
  const restitution = p1.stats.material === 'brass' || p2.stats.material === 'brass' ? 0.82 : 0.74;

  const I1 = getMomentOfInertia(p1);
  const I2 = getMomentOfInertia(p2);

  const r1CrossN = cross2D(r1, normal);
  const r2CrossN = cross2D(r2, normal);

  const invMass1 = 1 / p1.stats.mass;
  const invMass2 = 1 / p2.stats.mass;

  const impulseDenominator =
    invMass1 + invMass2 + (r1CrossN * r1CrossN) / I1 + (r2CrossN * r2CrossN) / I2;

  const impulseMag = -(1 + restitution) * velAlongNormal / impulseDenominator;
  const impulse = { x: normal.x * impulseMag, y: normal.y * impulseMag };

  // Apply linear momentum: delta V = J / m
  p1.vel.x -= impulse.x * invMass1;
  p1.vel.y -= impulse.y * invMass1;
  p2.vel.x += impulse.x * invMass2;
  p2.vel.y += impulse.y * invMass2;

  // Apply angular momentum: delta Omega = (r x J) / I
  p1.angularVel -= cross2D(r1, impulse) / I1;
  p2.angularVel += cross2D(r2, impulse) / I2;

  // Tangential surface friction
  const tangent = normalize({
    x: relativeVel.x - velAlongNormal * normal.x,
    y: relativeVel.y - velAlongNormal * normal.y,
  });

  const velAlongTangent = dot(relativeVel, tangent);
  const r1CrossT = cross2D(r1, tangent);
  const r2CrossT = cross2D(r2, tangent);
  const tangentDenominator =
    invMass1 + invMass2 + (r1CrossT * r1CrossT) / I1 + (r2CrossT * r2CrossT) / I2;

  const frictionCoeff = 0.28;
  let frictionMag = -velAlongTangent / tangentDenominator;
  frictionMag = Math.max(-impulseMag * frictionCoeff, Math.min(frictionMag, impulseMag * frictionCoeff));

  const frictionImpulse = { x: tangent.x * frictionMag, y: tangent.y * frictionMag };
  p1.vel.x -= frictionImpulse.x * invMass1;
  p1.vel.y -= frictionImpulse.y * invMass1;
  p2.vel.x += frictionImpulse.x * invMass2;
  p2.vel.y += frictionImpulse.y * invMass2;

  p1.angularVel -= cross2D(r1, frictionImpulse) / I1;
  p2.angularVel += cross2D(r2, frictionImpulse) / I2;

  const intensity = Math.min(1.0, Math.abs(velAlongNormal) / 10);

  return {
    pen1Id: p1.id,
    pen2Id: p2.id,
    intensity,
    material: p1.stats.material === 'brass' || p2.stats.material === 'brass' ? 'brass' : 'plastic',
    point: contactPoint,
  };
}

// Realistic Table Edge Knockout Rule:
// A pen only drops off if its Center of Mass crosses the edge, OR if >55% of its body hangs off!
export function checkTableBounds(
  pen: PenEntity,
  bounds: DeskBounds
): { isOut: boolean; outRatio: number } {
  const corners = getPenCorners(pen);
  let cornersOut = 0;

  for (const c of corners) {
    if (
      c.x < bounds.x ||
      c.x > bounds.x + bounds.width ||
      c.y < bounds.y ||
      c.y > bounds.y + bounds.height
    ) {
      cornersOut++;
    }
  }

  // Check center of mass
  const comOut =
    pen.pos.x < bounds.x ||
    pen.pos.x > bounds.x + bounds.width ||
    pen.pos.y < bounds.y ||
    pen.pos.y > bounds.y + bounds.height;

  // Overhang rule: Center of mass over edge = automatic tip!
  // Or 3 out of 4 corners over the edge = center tilted past pivot.
  const isOut = comOut || cornersOut >= 3;
  return { isOut, outRatio: cornersOut / 4 };
}

// Obstacle collision (Center eraser / metal sharpener)
export function resolveObstacleCollision(
  pen: PenEntity,
  obs: DeskObstacle
): CollisionEvent | null {
  const halfL = pen.stats.length / 2;
  const halfW = pen.stats.width / 2;
  const radius = Math.max(halfL, halfW);

  const obsCenterX = obs.x + obs.width / 2;
  const obsCenterY = obs.y + obs.height / 2;
  const dist = Math.hypot(pen.pos.x - obsCenterX, pen.pos.y - obsCenterY);
  if (dist > radius + Math.max(obs.width, obs.height)) return null;

  const nearestX = Math.max(obs.x, Math.min(pen.pos.x, obs.x + obs.width));
  const nearestY = Math.max(obs.y, Math.min(pen.pos.y, obs.y + obs.height));
  const deltaX = pen.pos.x - nearestX;
  const deltaY = pen.pos.y - nearestY;
  const distanceSq = deltaX * deltaX + deltaY * deltaY;

  const threshold = (pen.stats.width / 2) * (pen.stats.width / 2);
  if (distanceSq < threshold) {
    const d = Math.sqrt(distanceSq) || 0.1;
    const normal = { x: deltaX / d, y: deltaY / d };
    const overlap = pen.stats.width / 2 - d;

    // Push out
    pen.pos.x += normal.x * overlap;
    pen.pos.y += normal.y * overlap;

    const velAlongNormal = dot(pen.vel, normal);
    if (velAlongNormal < 0) {
      const bounciness = obs.type === 'eraser' ? 0.85 : 0.65;
      pen.vel.x -= (1 + bounciness) * velAlongNormal * normal.x;
      pen.vel.y -= (1 + bounciness) * velAlongNormal * normal.y;
      pen.angularVel += (Math.random() - 0.5) * 3;

      return {
        pen1Id: pen.id,
        obstacleId: obs.id,
        intensity: Math.min(1.0, Math.abs(velAlongNormal) / 8),
        material: obs.type === 'sharpener' ? 'steel' : 'plastic',
        point: { x: nearestX, y: nearestY },
      };
    }
  }

  return null;
}

// Advance physics with sub-stepping for zero-tunneling and high-fidelity real pen collisions
export function stepPhysics(
  pens: PenEntity[],
  obstacles: DeskObstacle[],
  bounds: DeskBounds,
  dt: number = 1 / 60
): { collisions: CollisionEvent[]; allStopped: boolean } {
  const collisions: CollisionEvent[] = [];
  const SUBSTEPS = 6;
  const subDt = dt / SUBSTEPS;

  let movingPensCount = 0;

  for (let s = 0; s < SUBSTEPS; s++) {
    for (const pen of pens) {
      if (pen.isKnockedOut) {
        if (pen.fallAnimationProgress !== undefined && pen.fallAnimationProgress < 1) {
          pen.fallAnimationProgress += subDt * 2.2;
          pen.angle += pen.angularVel * subDt * 1.5;
          pen.pos.y += 180 * subDt;
        }
        continue;
      }

      const speed = Math.hypot(pen.vel.x, pen.vel.y);
      const angSpeed = Math.abs(pen.angularVel);

      if (speed > 0.05 || angSpeed > 0.04) {
        if (s === 0) movingPensCount++;

        // Integrate positions
        pen.pos.x += pen.vel.x * subDt * 60;
        pen.pos.y += pen.vel.y * subDt * 60;
        pen.angle += pen.angularVel * subDt * 60;

        // Angle normalize [-PI, PI]
        pen.angle = ((pen.angle + Math.PI) % (Math.PI * 2)) - Math.PI;

        // Material-based friction deceleration: lighter pens glide smoothly; knurled/rubber pens have higher friction
        const frictionBase = pen.stats.friction * 60 * subDt;
        pen.vel.x *= Math.max(0, 1 - frictionBase);
        pen.vel.y *= Math.max(0, 1 - frictionBase);
        pen.angularVel *= Math.max(0, 1 - frictionBase * 1.5);

        // Motion trail
        if (s === 0) {
          if (pen.trail.length > 12) pen.trail.shift();
          pen.trail.push({ x: pen.pos.x, y: pen.pos.y });
        }
      } else {
        pen.vel.x = 0;
        pen.vel.y = 0;
        pen.angularVel = 0;
        if (s === 0 && pen.trail.length > 0) pen.trail.shift();
      }

      // Check table bounds
      const { isOut } = checkTableBounds(pen, bounds);
      if (isOut && !pen.isKnockedOut) {
        pen.isKnockedOut = true;
        pen.fallAnimationProgress = 0;
        pen.vel.x *= 0.5;
        pen.vel.y += 4;
      }

      // Obstacle collisions
      for (const obs of obstacles) {
        const col = resolveObstacleCollision(pen, obs);
        if (col && s === 0) collisions.push(col);
      }
    }

    // Pen-to-Pen collisions during substep
    for (let i = 0; i < pens.length; i++) {
      for (let j = i + 1; j < pens.length; j++) {
        const p1 = pens[i];
        const p2 = pens[j];
        if (p1.isKnockedOut || p2.isKnockedOut) continue;

        const col = checkPenPenCollision(p1, p2);
        if (col && col.colliding) {
          const event = resolvePenCollision(p1, p2, col);
          if (s === 0) collisions.push(event);
        }
      }
    }
  }

  return {
    collisions,
    allStopped: movingPensCount === 0,
  };
}
