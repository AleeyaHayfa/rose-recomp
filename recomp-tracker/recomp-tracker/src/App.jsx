import { useState, useEffect } from "react";

// ── Palette ──────────────────────────────────────────────
const C = {
  bg:       "#0D0D0B",
  surface:  "#161612",
  raised:   "#1E1E18",
  border:   "#2C2C24",
  green:    "#4E7C59",
  greenDim: "#2D4A34",
  beige:    "#C8B99A",
  beigeLight:"#E8DCC8",
  muted:    "#6B6556",
  danger:   "#8B4A3A",
};

// ── Constants ─────────────────────────────────────────────
const CAL_GOAL  = 1350;
const PROT_GOAL = 95;
const WATER_GOAL = 8;

const DEFAULT_MEALS = [
  { name: "Oat + dried fruits",      cal: 180, protein: 5  },
  { name: "Boiled egg",              cal: 70,  protein: 6  },
  { name: "Raw carrots (handful)",   cal: 30,  protein: 1  },
  { name: "¼ rice",                  cal: 90,  protein: 2  },
  { name: "Soup / sautéed veg",      cal: 80,  protein: 3  },
  { name: "Fried chicken (café)",    cal: 220, protein: 22 },
  { name: "Fried fish (café)",       cal: 190, protein: 20 },
  { name: "Greek yogurt (small)",    cal: 100, protein: 10 },
  { name: "Banana",                  cal: 90,  protein: 1  },
];

const DEFAULT_EXERCISES = [
  { id: "e1", name: "Knee push-up",  sets: 3, reps: 12, unit: "reps" },
  { id: "e2", name: "Plank",         sets: 3, reps: 30, unit: "sec"  },
  { id: "e3", name: "Glute bridge",  sets: 3, reps: 12, unit: "reps" },
  { id: "e4", name: "Burpees",       sets: 3, reps: 5,  unit: "reps" },
  { id: "e5", name: "Squats",        sets: 3, reps: 12, unit: "reps" },
];

// ── Storage helpers ───────────────────────────────────────
function todayKey() { return new Date().toISOString().split("T")[0]; }

function load(key, fallback) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; }
  catch { return fallback; }
}
function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

// ── Sub-components ────────────────────────────────────────

function ProgressBar({ value, max, color }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const over = value > max;
  return (
    <div style={{ height: 3, background: C.border, borderRadius: 2, overflow: "hidden" }}>
      <div style={{
        height: "100%", width: pct + "%",
        background: over ? C.danger : color,
        borderRadius: 2, transition: "width 0.35s ease",
      }} />
    </div>
  );
}

function StatBlock({ label, value, sub, color }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: color || C.beigeLight, fontFamily: "Georgia, serif", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: C.border, margin: "0 0 0 0" }} />;
}

function Toast({ msg }) {
  return (
    <div style={{
      position: "fixed", bottom: 88, left: "50%", transform: "translateX(-50%)",
      background: C.green, color: C.beigeLight, padding: "9px 20px",
      borderRadius: 6, fontSize: 13, fontWeight: 600, zIndex: 999,
      letterSpacing: "0.02em", whiteSpace: "nowrap",
      boxShadow: "0 2px 16px rgba(0,0,0,0.5)",
    }}>{msg}</div>
  );
}

function Sheet({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 200, display: "flex", alignItems: "flex-end" }}
      onClick={onClose}>
      <div style={{
        background: C.surface, width: "100%", maxWidth: 430, margin: "0 auto",
        borderRadius: "14px 14px 0 0", padding: "20px 20px 36px",
        maxHeight: "82vh", overflowY: "auto",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.beigeLight, fontFamily: "Georgia, serif" }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inp = {
  background: C.raised, border: `1px solid ${C.border}`, borderRadius: 8,
  padding: "10px 12px", color: C.beigeLight, fontSize: 14,
  width: "100%", boxSizing: "border-box", outline: "none",
  fontFamily: "system-ui, sans-serif",
};

function Btn({ children, onClick, variant = "primary", style: extra }) {
  const base = {
    border: "none", borderRadius: 7, padding: "10px 18px",
    fontWeight: 600, fontSize: 13, cursor: "pointer",
    letterSpacing: "0.02em", fontFamily: "system-ui, sans-serif",
    transition: "opacity 0.15s",
  };
  const variants = {
    primary:  { background: C.green,   color: C.beigeLight },
    ghost:    { background: C.raised,  color: C.beige,  border: `1px solid ${C.border}` },
    danger:   { background: C.danger,  color: C.beigeLight },
  };
  return <button onClick={onClick} style={{ ...base, ...variants[variant], ...extra }}>{children}</button>;
}

// ── Main App ──────────────────────────────────────────────
export default function App() {
  const dk = todayKey();

  const [tab,       setTab]       = useState("today");
  const [day,       setDay]       = useState(() => load("rct2_" + dk, { meals: [], water: 0, workoutDone: [] }));
  const [exercises, setExercises] = useState(() => load("rct2_exercises", DEFAULT_EXERCISES));
  const [profile,   setProfile]   = useState(() => load("rct2_profile", { startWeight: 50, currentWeight: 50, goalWeight: 45, dayCount: 3 }));
  const [toast,     setToast]     = useState(null);

  // sheet states
  const [mealSheet,    setMealSheet]    = useState(false);
  const [workoutSheet, setWorkoutSheet] = useState(false);
  const [editExSheet,  setEditExSheet]  = useState(false); // edit/add exercise
  const [editExData,   setEditExData]   = useState(null);  // null = new
  const [weightSheet,  setWeightSheet]  = useState(false);

  // custom meal form
  const [cName, setCName] = useState("");
  const [cCal,  setCCal]  = useState("");
  const [cProt, setCProt] = useState("");

  // custom weight
  const [newW, setNewW] = useState("");

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2200); }

  function updateDay(d) { setDay(d); save("rct2_" + dk, d); }
  function updateExercises(ex) { setExercises(ex); save("rct2_exercises", ex); }
  function updateProfile(p) { setProfile(p); save("rct2_profile", p); }

  const totalCal  = day.meals.reduce((s, m) => s + m.cal, 0);
  const totalProt = day.meals.reduce((s, m) => s + m.protein, 0);
  const calLeft   = CAL_GOAL - totalCal;
  const protLeft  = Math.max(0, PROT_GOAL - totalProt);

  function addPreset(p) {
    updateDay({ ...day, meals: [...day.meals, { ...p, id: Date.now() }] });
    setMealSheet(false);
    showToast(p.name + " added");
  }

  function addCustomMeal() {
    if (!cName.trim() || !cCal) return;
    updateDay({ ...day, meals: [...day.meals, { name: cName.trim(), cal: +cCal, protein: +cProt || 0, id: Date.now() }] });
    setCName(""); setCCal(""); setCProt("");
    setMealSheet(false);
    showToast(cName + " added");
  }

  function removeMeal(id) { updateDay({ ...day, meals: day.meals.filter(m => m.id !== id) }); }

  function toggleDone(id) {
    const done = day.workoutDone.includes(id)
      ? day.workoutDone.filter(x => x !== id)
      : [...day.workoutDone, id];
    updateDay({ ...day, workoutDone: done });
  }

  function saveExercise(data) {
    if (editExData) {
      updateExercises(exercises.map(e => e.id === editExData.id ? { ...editExData, ...data } : e));
      showToast("Exercise updated");
    } else {
      updateExercises([...exercises, { ...data, id: "e" + Date.now() }]);
      showToast("Exercise added");
    }
    setEditExSheet(false); setEditExData(null);
  }

  function deleteExercise(id) {
    updateExercises(exercises.filter(e => e.id !== id));
    updateDay({ ...day, workoutDone: day.workoutDone.filter(x => x !== id) });
    showToast("Exercise removed");
  }

  function logWeight() {
    const w = parseFloat(newW);
    if (!w || w < 20 || w > 300) return;
    updateProfile({ ...profile, currentWeight: w });
    setNewW(""); setWeightSheet(false);
    showToast("Weight saved — " + w + "kg");
  }

  const lost  = (profile.startWeight - profile.currentWeight).toFixed(1);
  const toGo  = (profile.currentWeight - profile.goalWeight).toFixed(1);
  const dayStr = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
  const workoutDoneCount = day.workoutDone.length;

  // ── Render ──────────────────────────────────────────────
  return (
    <div style={{ background: C.bg, minHeight: "100vh", maxWidth: 430, margin: "0 auto", fontFamily: "system-ui, -apple-system, sans-serif", color: C.beigeLight, paddingBottom: 84 }}>

      {toast && <Toast msg={toast} />}

      {/* ── HEADER ── */}
      <div style={{ padding: "28px 20px 16px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11, color: C.green, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
          Day {profile.dayCount} · Recomp
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.beigeLight, fontFamily: "Georgia, serif", lineHeight: 1.2 }}>
          {dayStr}
        </div>
      </div>

      {/* ════ TODAY TAB ════ */}
      {tab === "today" && (
        <>
          {/* Calorie summary */}
          <div style={{ padding: "18px 20px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", gap: 0, marginBottom: 14 }}>
              <StatBlock label="Eaten"   value={totalCal}   sub="kcal"           color={totalCal > CAL_GOAL ? C.danger : C.beigeLight} />
              <StatBlock label="Target"  value={CAL_GOAL}   sub="kcal goal"      color={C.beige} />
              <StatBlock label={calLeft >= 0 ? "Remaining" : "Over"} value={Math.abs(calLeft)} sub="kcal" color={calLeft < 0 ? C.danger : C.green} />
            </div>
            <ProgressBar value={totalCal} max={CAL_GOAL} color={C.green} />
          </div>

          {/* Protein + Water inline */}
          <div style={{ display: "flex", padding: "14px 20px", gap: 0, borderBottom: `1px solid ${C.border}` }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Protein</div>
              <ProgressBar value={totalProt} max={PROT_GOAL} color={C.beige} />
              <div style={{ fontSize: 12, color: C.beige, marginTop: 5 }}>{totalProt}g <span style={{ color: C.muted }}>/ {PROT_GOAL}g</span></div>
            </div>
            <div style={{ width: 1, background: C.border, margin: "0 18px" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Water</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {Array.from({ length: WATER_GOAL }).map((_, i) => (
                  <div key={i} style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: i < day.water ? C.green : C.raised,
                    border: `1px solid ${i < day.water ? C.green : C.border}`,
                    transition: "background 0.2s",
                  }} />
                ))}
              </div>
              <div style={{ fontSize: 12, color: C.beige, marginTop: 5 }}>{day.water} <span style={{ color: C.muted }}>/ {WATER_GOAL} glasses</span></div>
            </div>
          </div>

          {/* Water controls */}
          <div style={{ display: "flex", gap: 10, padding: "10px 20px", borderBottom: `1px solid ${C.border}` }}>
            <Btn variant="ghost" onClick={() => { if (day.water > 0) updateDay({ ...day, water: day.water - 1 }); }} style={{ flex: 1 }}>− Water</Btn>
            <Btn variant="primary" onClick={() => { if (day.water < WATER_GOAL) updateDay({ ...day, water: day.water + 1 }); }} style={{ flex: 1 }}>+ Glass</Btn>
          </div>

          {/* Meals list */}
          <div style={{ padding: "16px 20px 8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Meals today</div>
              <Btn variant="primary" onClick={() => setMealSheet(true)} style={{ padding: "7px 14px", fontSize: 12 }}>+ Add meal</Btn>
            </div>

            {day.meals.length === 0 && (
              <div style={{ color: C.muted, fontSize: 13, padding: "20px 0", textAlign: "center", borderTop: `1px solid ${C.border}` }}>
                Nothing logged yet. Tap + Add meal to start.
              </div>
            )}

            {day.meals.map((m, i) => (
              <div key={m.id}>
                {i > 0 && <Divider />}
                <div style={{ display: "flex", alignItems: "center", padding: "11px 0", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: C.beigeLight, fontWeight: 500 }}>{m.name}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{m.cal} kcal · {m.protein}g protein</div>
                  </div>
                  <button onClick={() => removeMeal(m.id)} style={{ background: "none", border: "none", color: C.muted, fontSize: 18, cursor: "pointer", padding: "0 4px", lineHeight: 1 }}>×</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ════ WORKOUT TAB ════ */}
      {tab === "workout" && (
        <div style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 11, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Mon · Wed · Thu</div>
              <div style={{ fontSize: 13, color: C.beige }}>{workoutDoneCount} of {exercises.length} done</div>
            </div>
            <Btn variant="primary" onClick={() => { setEditExData(null); setEditExSheet(true); }} style={{ padding: "7px 14px", fontSize: 12 }}>+ Exercise</Btn>
          </div>

          <div style={{ height: 1, background: C.border, margin: "14px 0" }} />

          {exercises.length === 0 && (
            <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: "24px 0" }}>
              No exercises yet. Tap + Exercise to add one.
            </div>
          )}

          {exercises.map((ex, i) => {
            const done = day.workoutDone.includes(ex.id);
            return (
              <div key={ex.id}>
                {i > 0 && <Divider />}
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 0" }}>
                  {/* Checkbox */}
                  <div onClick={() => toggleDone(ex.id)} style={{
                    width: 22, height: 22, borderRadius: 4, flexShrink: 0,
                    background: done ? C.green : "transparent",
                    border: `2px solid ${done ? C.green : C.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", transition: "all 0.15s",
                  }}>
                    {done && <div style={{ width: 10, height: 10, background: C.beigeLight, borderRadius: 2 }} />}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1 }} onClick={() => toggleDone(ex.id)}>
                    <div style={{ fontSize: 14, color: done ? C.muted : C.beigeLight, textDecoration: done ? "line-through" : "none", fontWeight: 500, transition: "color 0.15s" }}>{ex.name}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{ex.sets} sets · {ex.reps} {ex.unit}</div>
                  </div>

                  {/* Edit */}
                  <button onClick={() => { setEditExData(ex); setEditExSheet(true); }}
                    style={{ background: "none", border: "none", color: C.muted, fontSize: 13, cursor: "pointer", padding: "4px 6px" }}>Edit</button>
                </div>
              </div>
            );
          })}

          {workoutDoneCount > 0 && workoutDoneCount === exercises.length && (
            <div style={{ background: C.greenDim, border: `1px solid ${C.green}`, borderRadius: 8, padding: "12px 16px", marginTop: 16, fontSize: 13, color: C.green, fontWeight: 600 }}>
              Workout complete. Rest and recover.
            </div>
          )}
        </div>
      )}

      {/* ════ STATS TAB ════ */}
      {tab === "stats" && (
        <div style={{ padding: "16px 20px" }}>

          {/* Weight card */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>Weight</div>
            <div style={{ display: "flex", gap: 0 }}>
              <StatBlock label="Start"   value={profile.startWeight + "kg"}   color={C.beige} />
              <StatBlock label="Current" value={profile.currentWeight + "kg"} color={C.beigeLight} />
              <StatBlock label="Goal"    value={profile.goalWeight + "kg"}    color={C.green} />
            </div>
            {Number(lost) > 0 && (
              <div style={{ marginTop: 14, fontSize: 13, color: C.green }}>
                Down {lost}kg · {toGo}kg to goal
              </div>
            )}
            <Btn variant="ghost" onClick={() => setWeightSheet(true)} style={{ marginTop: 14, width: "100%" }}>Log today's weight</Btn>
          </div>

          {/* Targets */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18, marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>Daily targets</div>
            {[
              { label: "Calories",  value: CAL_GOAL  + " kcal", note: "slight deficit for fat loss" },
              { label: "Protein",   value: PROT_GOAL + "g",     note: "preserves muscle on recomp"  },
              { label: "Water",     value: WATER_GOAL + " glasses", note: "minimum daily"           },
            ].map((r, i) => (
              <div key={r.label}>
                {i > 0 && <Divider />}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0" }}>
                  <div>
                    <div style={{ fontSize: 13, color: C.beigeLight, fontWeight: 500 }}>{r.label}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{r.note}</div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.green, fontFamily: "Georgia, serif" }}>{r.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Coaching note */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 18 }}>
            <div style={{ fontSize: 11, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Coach note</div>
            <div style={{ fontSize: 13, color: C.beige, lineHeight: 1.7 }}>
              You're 150cm, 50kg targeting 45kg — a slow, clean recomp. Lose fat, protect muscle. Aim for −0.3kg per week. Your biggest lever right now is hitting protein: 5 eggs gets you 30g before you even leave your room.
            </div>
          </div>
        </div>
      )}

      {/* ════ BOTTOM NAV ════ */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 430, background: C.surface,
        borderTop: `1px solid ${C.border}`, display: "flex", padding: "10px 0 22px",
      }}>
        {[
          { id: "today",   label: "Today"   },
          { id: "workout", label: "Workout" },
          { id: "stats",   label: "Stats"   },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, background: "none", border: "none",
            color: tab === t.id ? C.green : C.muted,
            fontSize: 11, fontWeight: tab === t.id ? 700 : 500,
            cursor: "pointer", padding: "6px 0", letterSpacing: "0.06em",
            textTransform: "uppercase", borderTop: tab === t.id ? `2px solid ${C.green}` : "2px solid transparent",
            transition: "color 0.15s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* ════ MEAL SHEET ════ */}
      {mealSheet && (
        <Sheet title="Add a meal" onClose={() => setMealSheet(false)}>
          {DEFAULT_MEALS.map(p => (
            <div key={p.name} onClick={() => addPreset(p)} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 0", borderBottom: `1px solid ${C.border}`, cursor: "pointer",
            }}>
              <div style={{ fontSize: 14, color: C.beigeLight }}>{p.name}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{p.cal} kcal · {p.protein}g</div>
            </div>
          ))}

          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 11, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Custom meal</div>
            <input style={inp} placeholder="Meal name" value={cName} onChange={e => setCName(e.target.value)} />
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <input style={{ ...inp, flex: 1 }} type="number" placeholder="kcal" value={cCal} onChange={e => setCCal(e.target.value)} />
              <input style={{ ...inp, flex: 1 }} type="number" placeholder="protein (g)" value={cProt} onChange={e => setCProt(e.target.value)} />
            </div>
            <Btn variant="primary" onClick={addCustomMeal} style={{ marginTop: 12, width: "100%" }}>Add custom meal</Btn>
          </div>
        </Sheet>
      )}

      {/* ════ EDIT / ADD EXERCISE SHEET ════ */}
      {editExSheet && (
        <ExerciseSheet
          initial={editExData}
          onSave={saveExercise}
          onDelete={editExData ? () => { deleteExercise(editExData.id); setEditExSheet(false); } : null}
          onClose={() => { setEditExSheet(false); setEditExData(null); }}
        />
      )}

      {/* ════ WEIGHT SHEET ════ */}
      {weightSheet && (
        <Sheet title="Log weight" onClose={() => setWeightSheet(false)}>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>Current: {profile.currentWeight}kg</div>
          <input style={inp} type="number" step="0.1" placeholder="e.g. 49.5" value={newW} onChange={e => setNewW(e.target.value)} />
          <Btn variant="primary" onClick={logWeight} style={{ marginTop: 12, width: "100%" }}>Save</Btn>
        </Sheet>
      )}
    </div>
  );
}

// ── Exercise edit sheet (separate component for cleanliness) ──
function ExerciseSheet({ initial, onSave, onDelete, onClose }) {
  const [name, setName] = useState(initial?.name || "");
  const [sets, setSets] = useState(initial?.sets || 3);
  const [reps, setReps] = useState(initial?.reps || 10);
  const [unit, setUnit] = useState(initial?.unit || "reps");

  function handleSave() {
    if (!name.trim()) return;
    onSave({ name: name.trim(), sets: +sets, reps: +reps, unit });
  }

  return (
    <Sheet title={initial ? "Edit exercise" : "Add exercise"} onClose={onClose}>
      <div style={{ fontSize: 11, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Name</div>
      <input style={inp} placeholder="e.g. Diamond push-up" value={name} onChange={e => setName(e.target.value)} />

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Sets</div>
          <input style={inp} type="number" min="1" max="10" value={sets} onChange={e => setSets(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Reps / Sec</div>
          <input style={inp} type="number" min="1" value={reps} onChange={e => setReps(e.target.value)} />
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 11, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Unit</div>
        <div style={{ display: "flex", gap: 10 }}>
          {["reps", "sec", "min"].map(u => (
            <button key={u} onClick={() => setUnit(u)} style={{
              flex: 1, padding: "9px 0", borderRadius: 7, cursor: "pointer", fontSize: 13,
              background: unit === u ? C.green : C.raised,
              color: unit === u ? C.beigeLight : C.muted,
              border: `1px solid ${unit === u ? C.green : C.border}`,
              fontWeight: unit === u ? 700 : 400,
              transition: "all 0.15s",
            }}>{u}</button>
          ))}
        </div>
      </div>

      <Btn variant="primary" onClick={handleSave} style={{ marginTop: 18, width: "100%" }}>
        {initial ? "Save changes" : "Add exercise"}
      </Btn>

      {onDelete && (
        <Btn variant="danger" onClick={onDelete} style={{ marginTop: 10, width: "100%" }}>
          Remove exercise
        </Btn>
      )}
    </Sheet>
  );
}
