"use client";

import { useRouter } from "next/navigation";

/** Liste déroulante de navigation rapide : choisir une entrée ouvre l'adresse associée. */
export default function JumpSelect({ options, placeholder, label }: { options: { value: string; label: string }[]; placeholder: string; label: string }) {
  const router = useRouter();
  return (
    <select defaultValue="" onChange={(e) => e.target.value && router.push(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 text-gray-900 focus:ring-2 focus:ring-ecideBlue" aria-label={label}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
