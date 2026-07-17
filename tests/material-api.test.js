const assert = require('assert');

function buildMaterialPayload(payload) {
  return {
    MaterialName: payload.name,
    MaterialType: payload.type,
    Manufacturer: payload.manufacturer || '',
    Colour: payload.colour || '',
    Diameter: payload.diameter || null,
    Thickness: payload.thickness || null,
    Width: payload.width || null,
    Length: payload.length || null,
    Weight: payload.weight || null,
    Unit: payload.unit || 'kg',
    CurrentStock: payload.currentStock ?? payload.quantity ?? 0,
    MinimumStock: payload.minimumStock ?? 0,
    Barcode: payload.barcode || '',
    QRCode: payload.qrCode || '',
    Notes: payload.notes || '',
    Created: new Date().toISOString()
  };
}

function normalizeMaterialPayload(payload) {
  const material = buildMaterialPayload(payload);
  material.MaterialName = payload.name;
  material.MaterialType = payload.type;
  material.Manufacturer = payload.manufacturer || '';
  material.Colour = payload.colour || '';
  material.Diameter = payload.applicationType === 'Filament' ? (payload.diameter || null) : null;
  material.Thickness = payload.applicationType === 'Laser Cutter Material' ? (payload.thickness || null) : null;
  material.Width = payload.applicationType === 'Laser Cutter Material' ? (payload.width || null) : null;
  material.Length = payload.applicationType === 'Laser Cutter Material' ? (payload.length || null) : null;
  material.Weight = payload.applicationType === 'Filament' ? (payload.weight || null) : null;
  material.CurrentStock = payload.currentStock ?? payload.quantity ?? 0;
  material.MinimumStock = payload.minimumStock ?? 0;
  material.Unit = payload.unit || 'kg';
  return material;
}

const filament = normalizeMaterialPayload({
  name: 'PLA Black',
  type: 'PLA',
  manufacturer: 'Prusa',
  colour: 'Black',
  diameter: 1.75,
  weight: 1,
  quantity: 5,
  currentStock: 5,
  minimumStock: 2,
  unit: 'kg',
  applicationType: 'Filament'
});

const laser = normalizeMaterialPayload({
  name: 'Acrylic Sheet',
  type: 'Acrylic',
  manufacturer: 'Acrylite',
  colour: 'Clear',
  thickness: 3,
  width: 600,
  length: 1200,
  quantity: 4,
  currentStock: 4,
  minimumStock: 1,
  unit: 'sheet',
  applicationType: 'Laser Cutter Material'
});

assert.strictEqual(filament.Diameter, 1.75);
assert.strictEqual(filament.Weight, 1);
assert.strictEqual(laser.Thickness, 3);
assert.strictEqual(laser.Width, 600);
assert.strictEqual(laser.Length, 1200);
assert.strictEqual(filament.CurrentStock, 5);
assert.strictEqual(laser.Unit, 'sheet');
console.log('material payload mapping tests passed');
