"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Book = { id: number; title?: string };
type Prize = { id: number; name?: string };

type Author = {
  id: number;
  name: string;
  description: string;
  image: string;
  birthDate: string;
  books?: Book[];
  prizes?: Prize[];
};

const API_BASE = "/api";             
const AUTHORS = `${API_BASE}/authors`;
const BOOKS   = `${API_BASE}/books`;
const PRIZES  = `${API_BASE}/prizes`;

const fmtDate = (s: string) => (s?.includes("T") ? s.split("T")[0] : s);

export default function AuthorsPage() {
  const router = useRouter();
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const r = await fetch(AUTHORS, { cache: "no-store" });
        if (!r.ok) throw new Error(`Error listando autores (HTTP ${r.status})`);
        const data: Author[] = await r.json();
        setAuthors(data);
      } catch (e: any) {
        setError(e?.message ?? "Error desconocido");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const readMsg = async (res: Response) => {
    const txt = await res.text().catch(() => "");
    try {
      const j = JSON.parse(txt);
      return j?.apierror?.message || j?.message || txt || `HTTP ${res.status}`;
    } catch {
      return txt || `HTTP ${res.status}`;
    }
  };

  
  async function deleteBook(authorId: number, bookId: number) {
    
    let r = await fetch(`${BOOKS}/${bookId}`, { method: "DELETE", cache: "no-store" });
    if (r.ok) return;

    
    r = await fetch(`${AUTHORS}/${authorId}/books/${bookId}`, { method: "DELETE", cache: "no-store" });
    if (r.ok) {
      const del = await fetch(`${BOOKS}/${bookId}`, { method: "DELETE", cache: "no-store" });
      if (del.ok) return;
    }

    
    try {
      const getB = await fetch(`${BOOKS}/${bookId}`, { cache: "no-store" });
      if (getB.ok) {
        const b = await getB.json();
        const body = JSON.stringify({ ...b, authors: [] });
        const put = await fetch(`${BOOKS}/${bookId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body,
        });
        if (put.ok) {
          const del2 = await fetch(`${BOOKS}/${bookId}`, { method: "DELETE", cache: "no-store" });
          if (del2.ok) return;
        }
      }
    } catch {}

    throw new Error(`No se pudo eliminar el libro ${bookId}.`);
  }

  
  async function detachAndDeletePrize(prizeId: number): Promise<boolean> {
    const patchBodies = [{ author: null }, { authorId: null }, { remove: true }];
    for (const body of patchBodies) {
      const patch = await fetch(`${PRIZES}/${prizeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(body),
      });
      if (patch.ok) {
        const del = await fetch(`${PRIZES}/${prizeId}`, { method: "DELETE", cache: "no-store" });
        if (del.ok) return true;
      }
    }

    const getRes = await fetch(`${PRIZES}/${prizeId}`, { cache: "no-store" });
    if (getRes.ok) {
      const p = await getRes.json();
      const putBodies = [
        { ...p, author: null },
        { id: p?.id, author: null },
        { ...p, authorId: null },
      ];
      for (const body of putBodies) {
        const put = await fetch(`${PRIZES}/${prizeId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify(body),
        });
        if (put.ok) {
          const del = await fetch(`${PRIZES}/${prizeId}`, { method: "DELETE", cache: "no-store" });
          if (del.ok) return true;
        }
      }
    }

    const finalDel = await fetch(`${PRIZES}/${prizeId}`, { method: "DELETE", cache: "no-store" });
    return finalDel.ok;
  }

  async function handleDelete(id: number) {
    const ok = window.confirm(
      "Este autor puede tener libros/premios asociados.\n" +
      "Intentaré desvincular y eliminar relaciones antes de borrar el autor.\n\n¿Deseas continuar?"
    );
    if (!ok) return;

    try {
      setDeletingId(id);

      
      let del = await fetch(`${AUTHORS}/${id}`, { method: "DELETE", cache: "no-store" });
      if (del.ok) {
        setAuthors(prev => prev.filter(a => a.id !== id));
        return;
      }

      const msg = await readMsg(del);

      
      const aRes = await fetch(`${AUTHORS}/${id}`, { cache: "no-store" });
      if (!aRes.ok) throw new Error(msg);
      const a: Author = await aRes.json();

      
      for (const b of a.books || []) {
        await deleteBook(id, Number(b.id));
      }

      
      const pfails: number[] = [];
      for (const p of a.prizes || []) {
        const pid = Number((p as any).id ?? 0);
        if (!pid) continue;
        const okPrize = await detachAndDeletePrize(pid);
        if (!okPrize) pfails.push(pid);
      }

      if (pfails.length) {
        throw new Error(
          `No se pudieron eliminar/desvincular algunos premios: ${pfails.join(", ")}. ` +
          `Intenta manualmente desde el backend si es necesario.`
        );
      }

      
      del = await fetch(`${AUTHORS}/${id}`, { method: "DELETE", cache: "no-store" });
      if (!del.ok) {
        const m2 = await readMsg(del);
        throw new Error(m2 || "No se pudo eliminar el autor tras eliminar relaciones.");
      }

      setAuthors(prev => prev.filter(a => a.id !== id));
    } catch (e: any) {
      alert(e?.message ?? "No se pudo eliminar el autor.");
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <p className="p-6">Cargando…</p>;
  if (error)   return <p className="p-6 text-red-600">{error}</p>;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Lista de autores</h1>
        <Link href="/crear" className="underline">Crear autor</Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {authors.map((a) => (
          <div key={a.id} className="border rounded p-3">
            <div className="flex flex-col gap-2">
              <Image
                src={a.image}
                alt={a.name}
                width={100}
                height={100}
                className="rounded object-cover"
                unoptimized
              />
              <p className="font-semibold">{a.name}</p>
              <p className="text-sm opacity-70">Cumpleaños: {fmtDate(a.birthDate)}</p>
              <p className="text-sm">{a.description}</p>

              {(a.books?.length ?? 0) > 0 && (
                <p className="text-xs opacity-70">Libros asociados: {a.books!.length}</p>
              )}
              {(a.prizes?.length ?? 0) > 0 && (
                <p className="text-xs opacity-70">Premios asociados: {a.prizes!.length}</p>
              )}

              <div className="mt-2 flex gap-3">
                <button
                  className="border px-3 py-1 rounded"
                  onClick={() => handleDelete(a.id)}
                  disabled={deletingId === a.id}
                >
                  {deletingId === a.id ? "Eliminando…" : "Eliminar"}
                </button>
                <button
                  className="border px-3 py-1 rounded"
                  onClick={() => router.push(`/authors/${a.id}`)}
                >
                  Editar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}



