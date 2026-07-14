import { navigation, type NavItem } from '../data/navigation'

export interface FlatNavItem {
  id: string
  label: string
  path: string
  sectionId: string
  sectionLabel: string
}

export function flattenNavigation(items: NavItem[] = navigation): FlatNavItem[] {
  const flat: FlatNavItem[] = []
  for (const section of items) {
    if (section.children) {
      for (const child of section.children) {
        flat.push({
          id: child.id,
          label: child.label,
          path: child.path,
          sectionId: section.id,
          sectionLabel: section.label,
        })
      }
    } else {
      flat.push({
        id: section.id,
        label: section.label,
        path: section.path,
        sectionId: section.id,
        sectionLabel: section.label,
      })
    }
  }
  return flat
}

export function getNavItem(path: string): FlatNavItem | undefined {
  return flattenNavigation().find((item) => item.path === path)
}

export function getPrevNext(path: string): { prev?: FlatNavItem; next?: FlatNavItem } {
  const flat = flattenNavigation()
  const idx = flat.findIndex((item) => item.path === path)
  if (idx === -1) return {}
  return {
    prev: idx > 0 ? flat[idx - 1] : undefined,
    next: idx < flat.length - 1 ? flat[idx + 1] : undefined,
  }
}

export function findNavPath(path: string): { section?: NavItem; subsection?: NavItem } {
  for (const section of navigation) {
    if (section.path === path) return { section }
    if (section.children) {
      const subsection = section.children.find((c) => c.path === path)
      if (subsection) return { section, subsection }
    }
  }
  return {}
}
