"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const API = "/api/authors";

export default function CrearAutorPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [image, setImage] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setSaving(true);
      if (!name.trim()) throw new Error("El nombre es obligatorio");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) throw new Error("birthDate debe ser YYYY-MM-DD");

      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, birthDate, image, description }),
      });

      const errorText = !res.ok ? await res.text().catch(()=>"") : "";
      if (!res.ok) throw new Error(errorText || `Error creando autor (status ${res.status})`);

      // si quieres, puedes leer la respuesta: const created = await res.json();
      router.push("/authors");
    } catch (err:any) {
      setError(err.message ?? "Error creando autor");
      console.error("POST /api/authors failed:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">Crear autor</h1>

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Nombre</label>
          <input className="border p-2 rounded w-full" value={name} onChange={e=>setName(e.target.value)} placeholder="J. R. R. Tolkien" required />
        </div>

        <div>
          <label className="block text-sm mb-1">Fecha de nacimiento (YYYY-MM-DD)</label>
          <input className="border p-2 rounded w-full" value={birthDate} onChange={e=>setBirthDate(e.target.value)} placeholder="1892-01-03" required />
        </div>

        <div>
          <label className="block text-sm mb-1">URL de imagen</label>
          <input className="border p-2 rounded w-full" value={image} onChange={e=>setImage(e.target.value)} placeholder="https://example.com/autor.jpg" required />
        </div>

        <div>
          <label className="block text-sm mb-1">Descripción</label>
          <textarea className="border p-2 rounded w-full" value={description} onChange={e=>setDescription(e.target.value)} placeholder="Escritor y filólogo británico..." required />
        </div>

        {error && <p className="text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="border px-4 py-2 rounded">
            {saving ? "Guardando..." : "Guardar"}
          </button>
          <a href="/authors" className="border px-4 py-2 rounded">Cancelar</a>
        </div>
      </form>
    </div>
  );
}



