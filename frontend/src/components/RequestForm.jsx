export default function RequestForm({ form, setForm, errors }) {
  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  return (
    <div className="space-y-8">
      {/* Customer Information */}
      <div className="card p-5 sm:p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Customer Information</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="user_name" className="label">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="user_name"
              className="input"
              value={form.user_name}
              onChange={(e) => update('user_name', e.target.value)}
              placeholder="Ananya Sharma"
            />
            {errors.user_name && <p className="text-xs text-red-600 mt-1">{errors.user_name}</p>}
          </div>
          <div>
            <label htmlFor="phone" className="label">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              id="phone"
              className="input"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="+91 98765 43210"
            />
            {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="email" className="label">
              Email <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              id="email"
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="you@example.com"
            />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
          </div>
        </div>
      </div>

      {/* Printing Preferences */}
      <div className="card p-5 sm:p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Printing Preferences</h3>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="copies" className="label">
              Copies
            </label>
            <input
              id="copies"
              type="number"
              min={1}
              max={100}
              className="input"
              value={form.copies}
              onChange={(e) => update('copies', e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="paper_size" className="label">
              Paper Size
            </label>
            <select
              id="paper_size"
              className="input"
              value={form.paper_size}
              onChange={(e) => update('paper_size', e.target.value)}
            >
              {['A4', 'A3', 'Letter', 'Legal'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <fieldset>
            <legend className="label">Color</legend>
            <div className="flex gap-4">
              {[
                { value: 'bw', label: 'Black & White' },
                { value: 'color', label: 'Color' },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="color_mode"
                    value={opt.value}
                    checked={form.color_mode === opt.value}
                    onChange={(e) => update('color_mode', e.target.value)}
                    className="w-4 h-4 accent-brand-500"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="label">Sides</legend>
            <div className="flex gap-4">
              {[
                { value: 'single', label: 'Single-sided' },
                { value: 'double', label: 'Double-sided' },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="print_sides"
                    value={opt.value}
                    checked={form.print_sides === opt.value}
                    onChange={(e) => update('print_sides', e.target.value)}
                    className="w-4 h-4 accent-brand-500"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="label">Orientation</legend>
            <div className="flex gap-4">
              {[
                { value: 'portrait', label: 'Portrait' },
                { value: 'landscape', label: 'Landscape' },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="orientation"
                    value={opt.value}
                    checked={form.orientation === opt.value}
                    onChange={(e) => update('orientation', e.target.value)}
                    className="w-4 h-4 accent-brand-500"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="sm:col-span-2">
            <label htmlFor="notes" className="label">
              Optional Notes
            </label>
            <textarea
              id="notes"
              rows={3}
              className="input resize-none"
              placeholder="Any special instructions?"
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
