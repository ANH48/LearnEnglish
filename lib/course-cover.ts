/** Cover gradients rotate by course slug so course visuals feel lively without uploaded images. */
const COVERS = [
  "from-teal-400 to-emerald-600",
  "from-orange-300 to-rose-500",
  "from-sky-400 to-indigo-500",
  "from-amber-300 to-orange-500",
  "from-fuchsia-400 to-purple-600",
];

export function courseCoverGradient(slug: string): string {
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return COVERS[Math.abs(hash) % COVERS.length];
}
