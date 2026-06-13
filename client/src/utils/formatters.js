/**
 * Format a number as INR currency
 */
export function formatINR(amount) {
  const num = Number(amount)
  if (isNaN(num)) return '₹0.00'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

/**
 * Format a date string to a readable format
 */
export function formatDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Format a date to YYYY-MM for month filtering
 */
export function formatMonth(dateStr) {
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Get initials from a name
 */
export function getInitials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Capitalize first letter
 */
export function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * Get severity color classes
 */
export function getSeverityClasses(severity) {
  switch (severity) {
    case 'ERROR': return 'badge-danger'
    case 'WARNING': return 'badge-warning'
    case 'INFO': return 'badge-success'
    default: return 'badge-neutral'
  }
}
