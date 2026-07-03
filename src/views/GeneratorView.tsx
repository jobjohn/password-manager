import { useMemo, useState } from "react";
import {
  generatePassword,
  type GeneratorOptions,
} from "../lib/passwordGenerator";

interface Props {
  onUse: (password: string) => void;
  onClose: () => void;
}

const defaultOptions: GeneratorOptions = {
  length: 16,
  useLowercase: true,
  useUppercase: true,
  useDigits: true,
  useSymbols: false,
  excludeAmbiguous: true,
};

export function GeneratorView({ onUse, onClose }: Props) {
  const [options, setOptions] = useState<GeneratorOptions>(defaultOptions);
  const [regenKey, setRegenKey] = useState(0);

  const password = useMemo(
    () => generatePassword(options),
    // regenKey is a manual trigger to force a fresh draw with the same options
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options, regenKey],
  );

  function toggle(key: keyof GeneratorOptions) {
    setOptions((o) => ({ ...o, [key]: !o[key] }));
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-xs rounded bg-white p-4 shadow-lg dark:bg-neutral-800">
        <p className="mb-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">
          パスワード生成
        </p>
        <p className="mb-3 break-all rounded bg-neutral-100 px-2 py-1.5 font-mono text-sm text-neutral-900 dark:bg-neutral-700 dark:text-neutral-100">
          {password || "文字種を選択してください"}
        </p>
        <div className="mb-3 flex items-center gap-2">
          <input
            type="range"
            min={8}
            max={64}
            value={options.length}
            onChange={(e) =>
              setOptions((o) => ({ ...o, length: Number(e.target.value) }))
            }
            className="flex-1"
          />
          <span className="w-8 text-right text-xs text-neutral-500 dark:text-neutral-400">
            {options.length}
          </span>
        </div>
        <div className="mb-3 flex flex-col gap-1 text-xs text-neutral-700 dark:text-neutral-300">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={options.useLowercase}
              onChange={() => toggle("useLowercase")}
            />
            小文字 (a-z)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={options.useUppercase}
              onChange={() => toggle("useUppercase")}
            />
            大文字 (A-Z)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={options.useDigits}
              onChange={() => toggle("useDigits")}
            />
            数字 (0-9)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={options.useSymbols}
              onChange={() => toggle("useSymbols")}
            />
            記号 (!@#…)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={options.excludeAmbiguous}
              onChange={() => toggle("excludeAmbiguous")}
            />
            紛らわしい文字を除外 (l, I, 1, O, 0)
          </label>
        </div>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setRegenKey((k) => k + 1)}
            className="rounded border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-600"
          >
            再生成
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700"
            >
              キャンセル
            </button>
            <button
              type="button"
              disabled={password.length === 0}
              onClick={() => {
                onUse(password);
                onClose();
              }}
              className="rounded bg-neutral-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
            >
              使用する
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
