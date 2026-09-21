export function splitList(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function joinList(values: string[] | null | undefined): string {
  return (values ?? []).join(", ");
}
