'use client';

import { useState } from 'react';
import { Pause, Play } from 'lucide-react';
import type { Role } from '@/lib/demo-auth';
import { createLoginScene, employerOrigin } from '@/lib/login-map';
import CareerMap from './CareerMap';

export default function LoginJourney({ role }: { role: Role }) {
  const [paused, setPaused] = useState(false);
  // Fixed initial seeds keep server and client markup identical. New randomness
  // is generated only in the animation event, never during React rendering.
  const [scene, setScene] = useState(() => ({
    generation: 0,
    personal: createLoginScene(81273, false),
    employer: createLoginScene(31947, true),
  }));
  const personal = role === 'personal';
  const nodes = personal ? scene.personal : scene.employer;
  return (
    <div className={`login-journey ${personal ? 'journey-personal' : 'journey-employer'} ${paused ? 'is-paused' : ''}`}>
      <div
        key={`${role}-${scene.generation}`}
        className="login-map-cycle"
        onAnimationEnd={event => {
          // The CSS clock shares pause/reduced-motion behavior with the map.
          // Ignore bubbled events from individual paths and pins.
          if (event.target === event.currentTarget && event.animationName === 'login-cycle') {
            const nextNodes = createLoginScene(Math.floor(Math.random() * 0x100000000), !personal, nodes);
            setScene(current => ({ ...current, generation: current.generation + 1, [role]: nextNodes }));
          }
        }}
      >
        <CareerMap
          presentation="login"
          animateBase={false}
          destinations={nodes}
          direction={personal ? 'outgoing' : 'incoming'}
          origin={personal ? undefined : employerOrigin}
          brandOrigin={!personal}
          originLabel={personal ? '나의 경험' : 'Career Navi'}
        />
      </div>
      <div className="login-journey-caption">
        <span><i /> {personal ? '나의 경험에서 새로운 직무로' : '다양한 경험을 가진 인재가 Career Navi로'}<small>서비스 이해를 위한 예시</small></span>
        <button type="button" onClick={() => setPaused(!paused)} aria-label={paused ? '경로 애니메이션 재생' : '경로 애니메이션 일시정지'} aria-pressed={paused}>
          {paused ? <Play size={13} aria-hidden /> : <Pause size={13} aria-hidden />}
        </button>
      </div>
    </div>
  );
}

