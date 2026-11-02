export const getInitials = (name: string): string => {
  if (!name) return "U";
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};