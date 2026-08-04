"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";

type Exercise = { id: string; name: string; group: string };
type SetLog = { id: string; targetReps: number; reps: number; weight: number; done: boolean };
type SessionExercise = Exercise & { sets: SetLog[] };
type Workout = { id: string; name: string; date: string; exercises: SessionExercise[]; completed: boolean };
type AppData = { exercises: Exercise[]; workouts: Workout[] };
type Tab = "today" | "builder" | "library" | "progress";

const STORAGE_KEY = "forge-fitness-v1";
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const today = () => new Date().toISOString().slice(0, 10);

const starterExercises: Exercise[] = [
  { id: uid(), name: "Développé couché", group: "Pectoraux" },
  { id: uid(), name: "Développé incliné haltères", group: "Pectoraux" },
  { id: uid(), name: "Tractions", group: "Dos" },
  { id: uid(), name: "Rowing barre", group: "Dos" },
  { id: uid(), name: "Squat", group: "Jambes" },
  { id: uid(), name: "Presse à cuisses", group: "Jambes" },
  { id: uid(), name: "Soulevé de terre roumain", group: "Ischio-jambiers" },
  { id: uid(), name: "Développé militaire", group: "Épaules" },
  { id: uid(), name: "Élévations latérales", group: "Épaules" },
  { id: uid(), name: "Curl incliné", group: "Biceps" },
  { id: uid(), name: "Extension triceps poulie", group: "Triceps" },
];

const emptyData: AppData = { exercises: starterExercises, workouts: [] };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" }).format(new Date(value + "T12:00:00"));
}

function weekKey(date: string) {
  const d = new Date(date + "T12:00:00");
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day + 3);
  const firstThursday = new Date(d.getFullYear(), 0, 4);
  const firstDay = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDay + 3);
  return `${d.getFullYear()}-S${String(1 + Math.round((d.getTime() - firstThursday.getTime()) / 604800000)).padStart(2, "0")}`;
}

export default function Home() {
  const [data, setData] = useState<AppData>(emptyData);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("today");
  const [name, setName] = useState("Séance générale");
  const [selected, setSelected] = useState<string[]>([]);
  const [sets, setSets] = useState(4);
  const [reps, setReps] = useState(10);
  const [newExercise, setNewExercise] = useState("");
  const [newGroup, setNewGroup] = useState("Autre");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setData(JSON.parse(saved)); } catch { setData(emptyData); }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, ready]);

  const active = data.workouts.find((w) => w.date === today() && !w.completed);
  const completed = data.workouts.filter((w) => w.completed).sort((a, b) => b.date.localeCompare(a.date));

  const weekly = useMemo(() => {
    const map = new Map<string, { volume: number; sets: number; sessions: number }>();
    completed.forEach((workout) => {
      const key = weekKey(workout.date);
      const current = map.get(key) ?? { volume: 0, sets: 0, sessions: 0 };
      current.sessions += 1;
      workout.exercises.forEach((exercise) => exercise.sets.forEach((set) => {
        if (set.done) {
          current.volume += set.weight * set.reps;
          current.sets += 1;
        }
      }));
      map.set(key, current);
    });
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a)).slice(0, 8);
  }, [completed]);

  const records = useMemo(() => {
    const map = new Map<string, { name: string; weight: number; reps: number; date: string }>();
    completed.forEach((workout) => workout.exercises.forEach((exercise) => exercise.sets.forEach((set) => {
      const previous = map.get(exercise.id);
      if (set.done && (!previous || set.weight > previous.weight)) map.set(exercise.id, { name: exercise.name, weight: set.weight, reps: set.reps, date: workout.date });
    })));
    return [...map.values()].sort((a, b) => b.weight - a.weight);
  }, [completed]);

  function buildWorkout() {
    if (!selected.length) return;
    const exercises = selected.map((id) => data.exercises.find((e) => e.id === id)).filter(Boolean).map((exercise) => ({
      ...exercise!,
      sets: Array.from({ length: sets }, () => ({ id: uid(), targetReps: reps, reps, weight: 0, done: false })),
    }));
    const workout: Workout = { id: uid(), name: name.trim() || "Séance", date: today(), exercises, completed: false };
    setData((d) => ({ ...d, workouts: [workout, ...d.workouts.filter((w) => !(w.date === today() && !w.completed))] }));
    setSelected([]);
    setTab("today");
  }

  function updateSet(exerciseId: string, setId: string, patch: Partial<SetLog>) {
    if (!active) return;
    setData((d) => ({ ...d, workouts: d.workouts.map((workout) => workout.id !== active.id ? workout : {
      ...workout,
      exercises: workout.exercises.map((exercise) => exercise.id !== exerciseId ? exercise : {
        ...exercise,
        sets: exercise.sets.map((set) => set.id === setId ? { ...set, ...patch } : set),
      }),
    }) }));
  }

  function completeWorkout() {
    if (!active) return;
    setData((d) => ({ ...d, workouts: d.workouts.map((w) => w.id === active.id ? { ...w, completed: true } : w) }));
    setTab("progress");
  }

  function addExercise() {
    if (!newExercise.trim()) return;
    setData((d) => ({ ...d, exercises: [...d.exercises, { id: uid(), name: newExercise.trim(), group: newGroup.trim() || "Autre" }] }));
    setNewExercise("");
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `forge-fitness-${today()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function importData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (Array.isArray(parsed.exercises) && Array.isArray(parsed.workouts)) setData(parsed);
      } catch { alert("Fichier invalide"); }
    };
    reader.readAsText(file);
  }

  if (!ready) return <main className="shell"><p>Chargement…</p></main>;

  return (
    <main className="shell">
      <header className="topbar">
        <div><span className="eyebrow">FORGE FITNESS</span><h1>{tab === "today" ? "Aujourd’hui" : tab === "builder" ? "Nouvelle séance" : tab === "library" ? "Exercices" : "Progression"}</h1></div>
        <div className="avatar">FF</div>
      </header>

      {tab === "today" && (
        <section>
          {!active ? (
            <div className="hero card">
              <span className="pill">PRÊT À POUSSER</span>
              <h2>Ta prochaine séance commence ici.</h2>
              <p>Assemble tes exercices, fixe tes séries, puis note chaque charge au fil de l’entraînement.</p>
              <button className="primary" onClick={() => setTab("builder")}>Créer une séance</button>
            </div>
          ) : (
            <>
              <div className="session-head card"><div><span className="pill">EN COURS</span><h2>{active.name}</h2><p>{active.exercises.length} exercices · {active.exercises.reduce((n, e) => n + e.sets.length, 0)} séries</p></div><span className="date-chip">{formatDate(active.date)}</span></div>
              <div className="stack">
                {active.exercises.map((exercise) => (
                  <article className="exercise-card" key={exercise.id}>
                    <div className="exercise-title"><div><span>{exercise.group}</span><h3>{exercise.name}</h3></div><b>{exercise.sets.filter((s) => s.done).length}/{exercise.sets.length}</b></div>
                    <div className="set-grid set-head"><span>Série</span><span>kg</span><span>reps</span><span>✓</span></div>
                    {exercise.sets.map((set, index) => (
                      <div className={`set-grid ${set.done ? "done" : ""}`} key={set.id}>
                        <span className="set-number">{index + 1}</span>
                        <input inputMode="decimal" type="number" min="0" step="0.5" value={set.weight || ""} placeholder="0" onChange={(e) => updateSet(exercise.id, set.id, { weight: Number(e.target.value) })} />
                        <input inputMode="numeric" type="number" min="0" value={set.reps} onChange={(e) => updateSet(exercise.id, set.id, { reps: Number(e.target.value) })} />
                        <button className="check" onClick={() => updateSet(exercise.id, set.id, { done: !set.done })}>{set.done ? "✓" : ""}</button>
                      </div>
                    ))}
                  </article>
                ))}
              </div>
              <button className="primary finish" onClick={completeWorkout}>Terminer la séance</button>
            </>
          )}
          {completed[0] && <div className="last card"><span className="eyebrow">DERNIÈRE SÉANCE</span><h3>{completed[0].name}</h3><p>{formatDate(completed[0].date)} · {completed[0].exercises.length} exercices</p></div>}
        </section>
      )}

      {tab === "builder" && (
        <section className="stack">
          <div className="card form-card"><label>Nom de la séance<input value={name} onChange={(e) => setName(e.target.value)} /></label><div className="two"><label>Séries<input type="number" min="1" max="10" value={sets} onChange={(e) => setSets(Number(e.target.value))} /></label><label>Répétitions<input type="number" min="1" max="50" value={reps} onChange={(e) => setReps(Number(e.target.value))} /></label></div></div>
          <div><div className="section-title"><div><span className="eyebrow">BIBLIOTHÈQUE</span><h2>Choisis tes exercices</h2></div><b>{selected.length}</b></div><input className="search" placeholder="Rechercher un exercice" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
          <div className="choice-list">{data.exercises.filter((e) => `${e.name} ${e.group}`.toLowerCase().includes(query.toLowerCase())).map((exercise) => { const checked = selected.includes(exercise.id); return <button key={exercise.id} className={`choice ${checked ? "selected" : ""}`} onClick={() => setSelected((s) => checked ? s.filter((id) => id !== exercise.id) : [...s, exercise.id])}><div><span>{exercise.group}</span><strong>{exercise.name}</strong></div><i>{checked ? "✓" : "+"}</i></button>; })}</div>
          <button className="primary finish" disabled={!selected.length} onClick={buildWorkout}>Démarrer avec {selected.length} exercice{selected.length > 1 ? "s" : ""}</button>
        </section>
      )}

      {tab === "library" && (
        <section className="stack">
          <div className="card form-card"><span className="eyebrow">NOUVEL EXERCICE</span><label>Nom<input placeholder="Ex. Hack squat" value={newExercise} onChange={(e) => setNewExercise(e.target.value)} /></label><label>Groupe musculaire<input placeholder="Ex. Quadriceps" value={newGroup} onChange={(e) => setNewGroup(e.target.value)} /></label><button className="primary" onClick={addExercise}>Ajouter</button></div>
          <div className="choice-list">{data.exercises.map((exercise) => <div className="choice static" key={exercise.id}><div><span>{exercise.group}</span><strong>{exercise.name}</strong></div><button className="trash" onClick={() => setData((d) => ({ ...d, exercises: d.exercises.filter((e) => e.id !== exercise.id) }))}>×</button></div>)}</div>
          <div className="card backup"><h3>Sauvegarde</h3><p>Les données restent sur cet appareil. Exporte-les régulièrement pour garder une copie.</p><div className="two"><button className="secondary" onClick={exportData}>Exporter</button><label className="secondary file">Importer<input type="file" accept="application/json" onChange={importData} /></label></div></div>
        </section>
      )}

      {tab === "progress" && (
        <section className="stack">
          <div className="stats-grid"><div className="stat"><span>Séances</span><b>{completed.length}</b></div><div className="stat"><span>Séries</span><b>{completed.reduce((n, w) => n + w.exercises.reduce((m, e) => m + e.sets.filter((s) => s.done).length, 0), 0)}</b></div></div>
          <div className="card"><div className="section-title"><div><span className="eyebrow">8 SEMAINES</span><h2>Volume soulevé</h2></div></div>{weekly.length ? <div className="bars">{[...weekly].reverse().map(([key, value]) => { const max = Math.max(...weekly.map(([, v]) => v.volume), 1); return <div className="bar-item" key={key}><div className="bar-track"><div className="bar-fill" style={{ height: `${Math.max(8, value.volume / max * 100)}%` }} /></div><span>{key.split("S")[1]}</span></div>; })}</div> : <p className="muted">Termine une séance pour voir la courbe prendre vie.</p>}</div>
          <div><div className="section-title"><div><span className="eyebrow">RECORDS</span><h2>Meilleures charges</h2></div></div><div className="choice-list">{records.length ? records.map((record) => <div className="choice static" key={record.name}><div><span>{formatDate(record.date)} · {record.reps} reps</span><strong>{record.name}</strong></div><b>{record.weight} kg</b></div>) : <p className="muted">Tes futurs records attendent leur première plaque.</p>}</div></div>
          <div><div className="section-title"><div><span className="eyebrow">HISTORIQUE</span><h2>Séances terminées</h2></div></div><div className="choice-list">{completed.map((workout) => <div className="choice static" key={workout.id}><div><span>{formatDate(workout.date)}</span><strong>{workout.name}</strong></div><b>{workout.exercises.length}</b></div>)}</div></div>
        </section>
      )}

      <nav className="bottom-nav">
        <button className={tab === "today" ? "active" : ""} onClick={() => setTab("today")}><span>●</span>Jour</button>
        <button className={tab === "builder" ? "active" : ""} onClick={() => setTab("builder")}><span>＋</span>Créer</button>
        <button className={tab === "library" ? "active" : ""} onClick={() => setTab("library")}><span>▦</span>Exercices</button>
        <button className={tab === "progress" ? "active" : ""} onClick={() => setTab("progress")}><span>↗</span>Progrès</button>
      </nav>
    </main>
  );
}
