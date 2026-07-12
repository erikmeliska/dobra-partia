class ReceiptItem {
  name string
  quantity float
  unitPrice float
  totalPrice float
  vatRate float
}

class Receipt {
  qrCode string? @description("The full QR code content (URL or ID starting with O-). Look for the eKasa QR code, usually at the bottom of the receipt.")
  supplierName string? @description("Name of the store or supplier")
  supplierVatId string? @description("VAT ID (IC DPH) of the supplier")
  totalAmount float @description("Total amount paid")
  currency string @description("Currency code (e.g. EUR)")
  issueDate string? @description("Date of issue in ISO format YYYY-MM-DD")
  items ReceiptItem[]
}

function ExtractReceipt(receiptImage: image) -> Receipt {
  client Gemini
  prompt #"
    Extract data from this receipt.

    If there is a QR code (usually at the bottom), try to decode it.
    The QR code for Slovak eKasa usually contains a long ID starting with 'O-' or 'V-'.

    {{ receiptImage }}

    {{ ctx.output_format }}
  "#
}
