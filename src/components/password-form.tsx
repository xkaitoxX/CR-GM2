"use client";

import { useState } from "react";
import { savePassword } from "@/lib/client-api";

/** Asks for the website password, saves it on this device, then calls `onSaved`. */
export default function PasswordForm({ onSaved }: { onSaved: (password: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <form
      className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-100"
      onSubmit={(e) => {
        e.preventDefault();
        if (!value) return;
        savePassword(value);
        onSaved(value);
      }}
    >
      <label htmlFor="app-password" className="block font-medium">
        Enter the website password
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="app-password"
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="min-w-0 flex-1 rounded-lg bg-white px-3 py-2 text-zinc-900 ring-1 ring-amber-600/30 outline-none"
        />
        <button type="submit" className="rounded-lg bg-amber-900 px-3 py-2 font-medium text-white">
          Unlock
        </button>
      </div>
    </form>
  );
}
