'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';


type Apartment = {
  id?: string;
  name: string;
  base_price: number;
  room_count: number;
  description?: string;
};

export default function ApartmentFormModal({
  apartment,
  onClose,
  onSaved,
}: {
  apartment: Apartment | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Apartment>({
    name: '',
    base_price: 0,
    room_count: 1,
    description: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (apartment) setForm(apartment);
  }, [apartment]);

  const validate = () => {
    const errs: { [key: string]: string } = {};
    if (!form.name) errs.name = 'Name is required.';
    if (form.base_price <= 0) errs.base_price = 'Price must be greater than 0.';
    if (form.room_count <= 0) errs.room_count = 'Rooms must be at least 1.';
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const payload = {
      name: form.name,
      base_price: form.base_price,
      room_count: form.room_count,
      description: form.description,
    };

    if (apartment) {
      await supabase.from('apartments').update(payload).eq('id', apartment.id);
    } else {
      await supabase.from('apartments').insert([payload]);
    }

    onSaved();
    onClose();
  };

  const showError = (field: keyof Apartment) =>
    errors[field] ? <p className="text-sm text-red-600">{errors[field]}</p> : null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-40 z-40" onClick={onClose} />
      
      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 bg-white z-50 p-6 rounded shadow-xl w-[90%] max-w-md -translate-x-1/2 -translate-y-1/2">
        <h2 className="text-xl font-bold mb-4 text-blue-700">
          {apartment ? 'Edit Apartment' : 'Create Apartment'}
        </h2>

        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const errs = validate();
            if (Object.keys(errs).length > 0) {
              setErrors(errs);
              return;
            }
            setShowConfirm(true);
          }}
          className="space-y-4"
        >
          <div>
            <label className="text-sm font-medium">Name</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              value={form.name}
              onChange={(e) => {
                setForm({ ...form, name: e.target.value });
                if (errors.name) setErrors({ ...errors, name: '' });
              }}
            />
            {showError('name')}
          </div>

          <div>
            <label className="text-sm font-medium">Base Price</label>
            <input
              type="number"
              className="w-full p-2 border rounded"
              value={form.base_price}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setForm({ ...form, base_price: isNaN(val) ? 0 : val });
                if (errors.base_price) setErrors({ ...errors, base_price: '' });
              }}
            />
            {showError('base_price')}
          </div>

          <div>
            <label className="text-sm font-medium">Room Count</label>
            <input
              type="number"
              className="w-full p-2 border rounded"
              value={form.room_count}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setForm({ ...form, room_count: isNaN(val) ? 1 : val });
                if (errors.room_count) setErrors({ ...errors, room_count: '' });
              }}
            />
            {showError('room_count')}
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              className="w-full p-2 border rounded"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="text-gray-600 hover:underline">
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              {apartment ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>

      {/* Confirm Modal */}
      {showConfirm && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-30 z-50" />
          <div className="fixed top-1/2 left-1/2 z-50 bg-white p-6 rounded shadow-xl max-w-sm w-[90%] -translate-x-1/2 -translate-y-1/2">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              {apartment ? 'Confirm Update' : 'Confirm Creation'}
            </h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to {apartment ? 'update' : 'create'} this apartment?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="text-gray-600 hover:underline"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
