// ─── Shared Cart Types & Helpers ────────────────────────────────────────────
// Used by both Store.tsx and SpinWheel.tsx to share cart state via localStorage

export interface SharedCartItem {
  id: string
  emoji: string
  name: string
  price: number
  quantity: number
  currency: 'coin' | 'inr'
  abilityType?: string
  section?: string
}

export const SHARED_CART_KEY = 'mergeMaster2048_cart'

export function loadSharedCart(): SharedCartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(SHARED_CART_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveSharedCart(items: SharedCartItem[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(SHARED_CART_KEY, JSON.stringify(items))
}

export function addToSharedCart(item: Omit<SharedCartItem, 'quantity'>): SharedCartItem[] {
  const cart = loadSharedCart()
  const existing = cart.find(c => c.id === item.id)
  if (existing) {
    const updated = cart.map(c =>
      c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
    )
    saveSharedCart(updated)
    return updated
  }
  const newCart = [...cart, { ...item, quantity: 1 }]
  saveSharedCart(newCart)
  return newCart
}

export function updateSharedCartQuantity(id: string, delta: number): SharedCartItem[] {
  const cart = loadSharedCart()
  const updated = cart
    .map(c => {
      if (c.id === id) {
        const newQty = Math.max(0, c.quantity + delta)
        return newQty === 0 ? null : { ...c, quantity: newQty }
      }
      return c
    })
    .filter(Boolean) as SharedCartItem[]
  saveSharedCart(updated)
  return updated
}

export function removeFromSharedCart(id: string): SharedCartItem[] {
  const cart = loadSharedCart()
  const updated = cart.filter(c => c.id !== id)
  saveSharedCart(updated)
  return updated
}

export function clearSharedCart(): void {
  saveSharedCart([])
}
