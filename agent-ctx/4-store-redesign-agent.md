# Task 4 - Store Redesign Agent

## Task: Redesign Store with QR code payment flow

## Work Done

### Removed WhatsApp Redirect
- Deleted `WHATSAPP_NUMBER` constant and `openWhatsApp()` function
- No more external redirects when buying items

### Added UPI Payment Modal (UPIPaymentModal)
- QR code section: generates UPI QR using `api.qrserver.com` with deep link `upi://pay?pa=9897186065@fam&pn=MergeMaster2048&am=${price}&cu=INR`
- Fallback text when QR image fails to load
- UPI ID display (`9897186065@fam`) with copy-to-clipboard button
- Helper text: "UPI ID: Copy and pay in any UPI app"

### Package Details (Read-Only)
- Shows item name, price in ₹, quantity
- Non-editable by user

### Payment Form
- WhatsApp Number (required)
- Name (required)
- Transaction ID (required)
- UTR Number (optional)
- Upload Proof button → file input → base64 conversion → stored with order

### Action Buttons
- CANCEL button (closes modal)
- BOOK ORDER button (submits order with all details)

### Coin Pack Pricing
- Updated to 1000 coins = ₹1 ratio
- Display format: "10,000 Coins = ₹10"
- COIN_PACKS prices: 10k=₹10, 30k=₹30, 50k=₹50, 80k=₹80

### StoreOrder Interface
```typescript
interface StoreOrder {
  id: string
  date: string
  playerId: string
  item: string
  price: number
  quantity: number
  whatsappNumber: string
  name: string
  transactionId: string
  utrNumber: string
  proofBase64?: string
  status: 'pending' | 'approved' | 'rejected'
  upiId: string
}
```

### localStorage
- Key: `mergeMaster2048_orders`
- Old key `mergeMaster2048_storeHistory` no longer used

### History Tab
- Shows orders with status badges (Pending/Approved/Rejected)
- Shows proof image thumbnail when available
- Shows transaction ID, UTR, and WhatsApp number

## Lint Result
- 0 errors, 0 warnings
