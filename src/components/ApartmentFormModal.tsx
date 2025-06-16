'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { X } from 'lucide-react';

type Apartment = {
  id: string;
  name: string;
  description: string;
  base_price: number;
  room_count: number;
  created_at: string;
};

type Props = {
  apartment?: Apartment | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function ApartmentFormModal({ apartment, onClose, onSaved }: Props) {
  const [name, setName] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [roomCount, setRoomCount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [StarterKit],
    content: apartment?.description || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none min-h-[100px] max-w-none',
      },
    },
  });

  useEffect(() => {
    if (apartment) {
      setName(apartment.name);
      setBasePrice(apartment.base_price.toString());
      setRoomCount(apartment.room_count.toString());
      editor?.commands.setContent(apartment.description);
    }
  }, [apartment, editor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = {
        name,
        description: editor?.getHTML() || '',
        base_price: parseFloat(basePrice),
        room_count: parseInt(roomCount),
      };

      if (apartment) {
        const { error } = await supabase
          .from('apartments')
          .update(data)
          .eq('id', apartment.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('apartments')
          .insert(data);

        if (error) throw error;
      }

      onSaved();
    } catch (err) {
      console.error('Error saving apartment:', err);
      setError('Error saving apartment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-[90%] max-w-2xl shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">
            {apartment ? 'Edit Apartment' : 'Create Apartment'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <div className="border rounded-lg focus-within:ring-2 focus-within:ring-blue-500">
              <div className="border-b p-2 bg-gray-50 flex gap-2">
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  className={`p-1 rounded ${editor?.isActive('bold') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                >
                  <strong>B</strong>
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  className={`p-1 rounded ${editor?.isActive('italic') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                >
                  <em>I</em>
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  className={`p-1 rounded ${editor?.isActive('bulletList') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                >
                  • List
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  className={`p-1 rounded ${editor?.isActive('orderedList') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                >
                  1. List
                </button>
              </div>
              <EditorContent editor={editor} className="p-3" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base Price (THB)
              </label>
              <input
                type="number"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Rooms
              </label>
              <input
                type="number"
                value={roomCount}
                onChange={(e) => setRoomCount(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                min="1"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:underline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : apartment ? 'Save Changes' : 'Create Apartment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
