'use client';

import { useState, useEffect, useRef } from 'react';
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
  photo_url?: string;
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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(apartment?.photo_url || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (apartment && apartment.photo_url) {
      setPhotoUrl(apartment.photo_url);
    }
  }, [apartment, editor]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setPhotoFile(file);
    if (file) {
      setPhotoPreview(URL.createObjectURL(file));
    } else {
      setPhotoPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let uploadedPhotoUrl = photoUrl;
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const filePath = `apartments/${apartment ? apartment.id : Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('apartment-photos')
          .upload(filePath, photoFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('apartment-photos').getPublicUrl(filePath);
        uploadedPhotoUrl = data.publicUrl;
      }

      const data = {
        name,
        description: editor?.getHTML() || '',
        base_price: parseFloat(basePrice),
        room_count: parseInt(roomCount),
        photo_url: uploadedPhotoUrl || null,
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
          {/* Photo Upload on top, Name below */}
          <div className="flex flex-col items-start gap-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
            <div
              className={`w-32 h-32 bg-gray-100 flex items-center justify-center rounded mb-2 text-gray-400 cursor-pointer border-2 border-dashed transition-all duration-200 ${loading ? 'opacity-60' : 'hover:border-blue-400 hover:bg-blue-50'}`}
              onClick={() => !loading && fileInputRef.current?.click()}
              tabIndex={0}
              role="button"
              aria-label="Upload photo"
              onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !loading) fileInputRef.current?.click(); }}
              style={{ position: 'relative' }}
            >
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover rounded" />
              ) : photoUrl ? (
                <img src={photoUrl} alt="Apartment" className="w-full h-full object-cover rounded" />
              ) : (
                <span className="flex flex-col items-center justify-center text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16V8a2 2 0 012-2h2l2-2h4l2 2h2a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16l5-6a2 2 0 013 0l5 6" /></svg>
                  <span className="text-xs">Click or drag to upload</span>
                </span>
              )}
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handlePhotoChange}
                className="hidden"
                disabled={loading}
              />
              {loading && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded">
                  <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                </div>
              )}
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-1 mt-2">Name</label>
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
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d*$/.test(val)) setBasePrice(val);
                }}
                inputMode="numeric"
                pattern="[0-9]*"
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
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d*$/.test(val)) setRoomCount(val);
                }}
                inputMode="numeric"
                pattern="[0-9]*"
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
