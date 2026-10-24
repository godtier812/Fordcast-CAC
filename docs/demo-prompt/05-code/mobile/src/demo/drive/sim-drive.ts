// mobile/src/demo/drive/sim-drive.ts — runs a simulated drive in real time. The fix stream and the speech plan are the
// SAME pure functions the tests check (drive.ts), so what is spoken on camera is exactly what CI asserted.
import { useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import { getCompiled, scenarioById, useDemo, effectiveNet } from '../store/demo-store';
import { displayAt, type DisplayRisk } from '../scenario/display';
import type { Lang } from '../i18n/tr';
import { playUtterance } from '../voice/speak';
import { ROUTES, crossingsOnRoute, drivePlan, fixes, initialLockout, stepLockout, type DriveScript, type Fix, type Utterance } from './drive';

export type DriveFrame = { fix: Fix; tS: number; ahead: { id: string; m: number; risk: DisplayRisk }[]; done: boolean };

export function useSimulatedDrive(script: DriveScript | null, lang: Lang) {
  const scenarioId = useDemo((s) => s.scenarioId); const netOverride = useDemo((s) => s.netOverride);
  const [plan, setPlan] = useState<{ fixes: Fix[]; utterances: Utterance[] } | null>(null);
  const [frame, setFrame] = useState<DriveFrame | null>(null);
  const spoken = useRef(new Set<number>()); const startWall = useRef<number | null>(null);

  useEffect(() => {                                                  // precompute (~0.2 s JIT-less) after the entry animation
    if (!script) return;
    const task = InteractionManager.runAfterInteractions(() => {
      const cmp = getCompiled(scenarioId);
      const withNet = { ...cmp, scenario: { ...cmp.scenario, network: effectiveNet(scenarioById(scenarioId), netOverride) } };
      setPlan({ fixes: Array.from(fixes(script)), utterances: drivePlan(withNet, script).utterances });
    });
    return () => task.cancel();
  }, [script, scenarioId, netOverride]);

  useEffect(() => {
    if (!script || !plan) return;
    const st = useDemo.getState();
    if (startWall.current == null) {                                  // the risk clock runs at 1× during a drive (D §30.7)
      startWall.current = Date.now(); st.seek(script.startSimMin); st.setSpeed(1); st.play();
    }
    let lock = initialLockout();
    const id = setInterval(() => {
      const tS = Math.floor((Date.now() - startWall.current!) / 1000);
      const fix = plan.fixes[Math.min(tS, plan.fixes.length - 1)]!;
      lock = stepLockout(lock, { t: tS * 1000, speed: fix.speed });
      const s = useDemo.getState(); s.setLocked(s.lockout === 'auto' && lock.locked);
      const cmp = getCompiled(s.scenarioId); const net = effectiveNet(scenarioById(s.scenarioId), s.netOverride);
      const simMin = script.startSimMin + tS / 60;
      const ahead = crossingsOnRoute(ROUTES[fix.route].line).filter((x) => x.alongM > fix.alongM + 50).slice(0, 3)
        .map((x) => ({ id: x.c.id, m: Math.round(x.alongM - fix.alongM), risk: displayAt(cmp, x.c.id, simMin, net) }));
      setFrame({ fix, tS, ahead, done: tS >= plan.fixes.length - 1 });
      const voiceLang: Lang = s.voiceLang === 'app' ? lang : s.voiceLang;
      for (const u of plan.utterances) if (u.tS <= tS && !spoken.current.has(u.tS)) { spoken.current.add(u.tS); void playUtterance(u, voiceLang); }
    }, 1000);
    return () => clearInterval(id);
  }, [script, plan, lang]);

  return useMemo(() => ({ ready: !!plan, frame }), [plan, frame]);
}
