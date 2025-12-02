import React, { useState, useRef, useEffect } from 'react';
import { Download, Plus, Trash2, Edit2, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import { downloadPDFWithRetry, downloadPDF, previewPDF, PDF_BLOB_SMALL_THRESHOLD_BYTES } from '../../utils/pdfGenerator';
import { PDFEditorModal } from './PDFEditorModal';

const EditableQuotationTemplate = () => {
  const printRef = useRef(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showPanel, setShowPanel] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPDFEditor, setShowPDFEditor] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);

  const [data, setData] = useState({
    pageTitle: 'Central European Splendours — Summer 2026',
    companyLogo: 'https://via.placeholder.com/200x70.png?text=Traverse+Globe+Logo',
    destination: 'Dubai',
    packageImage: 'C:/Users/akash.verma/Downloads/photo-1512453979798-5ea266f8880c.jpg',
    packageTitle: '3-Star Dubai Supersaver Package - 3N/4D',
    packageSummary: 'Package summary details',
    duration: '5 Days / 4 Nights',
    price: '35,999',
    placesCovered: 'Dubai City Tour, Desert Safari, Burj Khalifa, Dhow Cruise',
    overview: 'You start in Paris — the City of Lights — then travel through Switzerland, Austria and Italy. Enjoy guided tours, scenic train rides, alpine vistas, romantic gondola rides in Venice and the timeless history of Rome.',
    highlights: [
      'Paris city tour, Seine River Cruise, Versailles',
      'Mt Titlis & Lucerne, Jungfraujoch (optional), Rhine Falls',
      'Venice gondola ride, Florence & Pisa, Rome guided tour',
      'Swarovski World, scenic long-distance coach transfers',
    ],
    accommodation: {
      title: 'Accommodation Details',
      roomCategory: '5 Days / 4 Nights',
      mealPlan: 'Breakfast & Dinner',
      note: 'Dubai City Tour, Desert Safari, Burj Khalifa, Dhow Cruise',
    },
    packageSummary: 'Package summary details Dubai Quatition',
    days: [
      {
        id: 1,
        title: 'Day 1: Arrive in Paris',
        image: 'https://images.unsplash.com/photo-1488747279002-c8523379faaa?q=80&w=800&auto=format&fit=crop',
        description: 'Arrive in Paris. Meet and greet at airport, private transfer to hotel. Evening Seine River Cruise and overnight in Paris.',
      },
      {
        id: 2,
        title: 'Day 2: Paris City Tour & Versailles',
        image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=800&auto=format&fit=crop',
        description: 'Guided city tour, visit Eiffel Tower (2nd Level), Palace of Versailles and Seine cruise. Overnight in Paris.',
      },
    ],
    inclusions: [
      'Accommodation as per itinerary',
      'Meals mentioned in itinerary',
      'Transfers & sightseeing as per itinerary',
      'Services of a professional tour manager',
    ],
    exclusions: [
      'Airfare, visa, insurance',
      'Personal expenses',
      'Any services not mentioned',
    ],
    terms: [
      'Rates are valid for a minimum of 2 passengers traveling together.',
      'Hotel rooms are subject to availability at the time of booking.',
      'Any increase in airfare, taxes, or other charges will be borne by the client.',
      'All sightseeing and transfers are as per itinerary unless stated otherwise.',
      'Cancellation charges apply as per company policy.',
      'Traverse Globe reserves the right to make changes in the itinerary due to unforeseen circumstances.',
      'All payments must be cleared before the travel date.',
    ],
    similarPackages: [
      { title: '4N/5D – Dubai Delight Tour', price: '55,499' },
      { title: '4N/5D – Dubai Delight Tour', price: '55,499' },
      { title: '4N/5D – Dubai Delight Tour', price: '55,499' },
      { title: '4N/5D – Dubai Delight Tour', price: '55,499' },
    ],
    recommendedActivities: [
      { id: 1, title: 'Dhow Cruise Dinner', description: 'Romantic dinner cruise along Dubai Creek with stunning city views', icon: '🚢' },
      { id: 2, title: 'Desert Safari', description: 'Thrilling dune bashing, camel rides, and traditional BBQ dinner', icon: '🏜️' },
      { id: 3, title: 'Burj Khalifa Visit', description: 'Experience breathtaking views from the world\'s tallest building', icon: '🏙️' },
      { id: 4, title: 'Dubai Mall Shopping', description: 'World-class shopping and entertainment destination', icon: '🛍️' }
    ],
    feedbackText: 'We value your feedback! Please share your thoughts about this package or your travel experience here...',
    website: 'traverseglobe.com',
    address: '129 First Floor, Antriksh Bhavan, Connaught Place, New Delhi, Delhi, Pin 110001',
    packageLink: '#',
    similarPackageLinks: ['#', '#', '#', '#'],
  });

  const handleDownloadPDF = async () => {
    if (!printRef.current) {
      toast.error('Preview not ready');
      return;
    }

    // ensure element has size
    if (printRef.current.offsetWidth === 0 || printRef.current.offsetHeight === 0) {
      toast.error('Preview is not visible. Please ensure the preview panel is active before exporting.');
      return;
    }

    // hide interactive controls during export
    setIsExporting(true);
    setPdfLoading(true);
    try {
      const element = printRef.current;
      const blob = await downloadPDFWithRetry(element, `${data.pageTitle || data.packageTitle}.pdf`);
      if (blob && blob.size && blob.size < PDF_BLOB_SMALL_THRESHOLD_BYTES) {
        toast.warning('Generated PDF looks suspiciously small; opening preview for inspection.');
        try {
          await previewPDF(element);
        } catch (previewErr) {
          console.error('Auto-preview failed', previewErr);
          toast.error('Preview failed; check console for details');
        }
      } else {
        toast.success('PDF downloaded successfully!');
      }
    } catch (error) {
      toast.error('Failed to download PDF');
    } finally {
      setPdfLoading(false);
      // restore controls after a short delay so DOM finishes
      setTimeout(() => setIsExporting(false), 300);
    }
  };

  // update document title when pageTitle changes
  useEffect(() => {
    document.title = data.pageTitle || 'Quotation';
    updateWhatsAppLinks();
  }, [data.pageTitle]);

  useEffect(() => {
    updateWhatsAppLinks();
  }, [data.packageTitle]);

  // Generic file reader to set image data (supports local preview)
  const handleFileChange = (e, path) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => updateField(path, ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleDayImageChange = (e, dayId) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => updateDay(dayId, 'image', ev.target.result);
    reader.readAsDataURL(file);
  };

  // onInput for contenteditable elements
  const onEditableInput = (path, e) => {
    const text = e.currentTarget.innerText;
    updateField(path, text);
  };

  const attachPackageLink = (url) => {
    updateField('packageLink', url);
  };

  const attachSimilarLink = (index, url) => {
    const links = [...data.similarPackageLinks];
    links[index] = url;
    updateField('similarPackageLinks', links);
  };

  const openWhatsApp = () => {
    const whatsappNumber = '9520232324';
    const message = `Hello, I would like to confirm my interest in the package: ${data.packageTitle}`;
    const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappLink, '_blank');
  };

  const updateWhatsAppLinks = () => {
    const packageTitle = data.packageTitle || '';
    const message = encodeURIComponent(`Hi, I'm interested in your package: "${packageTitle}". Please share more details.`);
    const numbers = ['919997085457', '919520232324'];
    const small1 = document.getElementById('whatsapp1_small');
    const small2 = document.getElementById('whatsapp2_small');
    if (small1) small1.href = `https://wa.me/${numbers[0]}?text=${message}`;
    if (small2) small2.href = `https://wa.me/${numbers[1]}?text=${message}`;
  };

  const updateField = (path, value) => {
    const keys = path.split('.');
    setData((prev) => {
      const updated = JSON.parse(JSON.stringify(prev));
      let current = updated;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const addDay = () => {
    const newDay = {
      id: Math.max(...data.days.map((d) => d.id), 0) + 1,
      title: `Day ${data.days.length + 1}`,
      image: 'https://images.unsplash.com/photo-1505765051693-9de34a6fca1b?q=80&w=800&auto=format&fit=crop',
      description: 'Enter itinerary details...',
    };
    updateField('days', [...data.days, newDay]);
  };

  const removeDay = (id) => {
    updateField(
      'days',
      data.days.filter((d) => d.id !== id)
    );
  };

  const updateDay = (id, field, value) => {
    const updated = data.days.map((d) => (d.id === id ? { ...d, [field]: value } : d));
    updateField('days', updated);
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="flex gap-6 p-6">
      {/* Side Panel */}
      {showPanel && (
        <div className="w-96 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Edit Content</h2>

          {/* Basic Info */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Basic Information</h3>
            <label className="block text-sm font-medium text-gray-600 mb-1">Page Title (visible on PDF)</label>
            <input
              type="text"
              value={data.pageTitle}
              onChange={(e) => updateField('pageTitle', e.target.value)}
              placeholder="Page Title"
              className="w-full mb-3 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <label className="block text-sm font-medium text-gray-600 mb-1">Page Title</label>
            <input
              type="text"
              value={data.pageTitle}
              onChange={(e) => updateField('pageTitle', e.target.value)}
              placeholder="Page Title"
              className="w-full mb-3 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={data.destination}
              onChange={(e) => updateField('destination', e.target.value)}
              placeholder="Destination"
              className="w-full mb-3 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={data.packageTitle}
              onChange={(e) => updateField('packageTitle', e.target.value)}
              placeholder="Package Title"
              className="w-full mb-3 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={data.duration}
              onChange={(e) => updateField('duration', e.target.value)}
              placeholder="Duration"
              className="w-full mb-3 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={data.price}
              onChange={(e) => updateField('price', e.target.value)}
              placeholder="Price"
              className="w-full mb-3 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              value={data.placesCovered}
              onChange={(e) => updateField('placesCovered', e.target.value)}
              placeholder="Places Covered"
              className="w-full mb-3 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="2"
            />

            <label className="block text-sm font-medium text-gray-600 mb-1">Package Summary</label>
            <input
              type="text"
              value={data.packageSummary}
              onChange={(e) => updateField('packageSummary', e.target.value)}
              placeholder="Short package summary"
              className="w-full mb-3 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-600 mb-1">Company Logo</label>
              <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'companyLogo')} />
            </div>
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-600 mb-1">Package Banner</label>
              <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'packageImage')} />
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <a id="packageLink" href={data.packageLink || '#'} target="_blank" rel="noreferrer" style={{ background: 'linear-gradient(135deg, black, #0d4b80)', color: '#fff', padding: '10px 26px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, letterSpacing: 0.5, boxShadow: '0 3px 8px rgba(27,108,168,0.3)' }}>
              View Full Package
            </a>
          </div>

          {/* Overview */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Overview</h3>
            <textarea
              value={data.overview}
              onChange={(e) => updateField('overview', e.target.value)}
              placeholder="Overview text"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
            />
          </div>

          {/* Accommodation */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Accommodation</h3>
            <input
              type="text"
              value={data.accommodation.roomCategory}
              onChange={(e) => updateField('accommodation.roomCategory', e.target.value)}
              placeholder="Room Category"
              className="w-full mb-3 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={data.accommodation.mealPlan}
              onChange={(e) => updateField('accommodation.mealPlan', e.target.value)}
              placeholder="Meal Plan"
              className="w-full mb-3 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Days */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Itinerary Days</h3>
            <button
              onClick={addDay}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded mb-3 hover:bg-blue-600 flex items-center justify-center gap-2"
            >
              <Plus size={18} /> Add Day
            </button>
            {data.days.map((day) => (
              <div key={day.id} className="bg-gray-50 p-3 rounded mb-3 border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <input
                    type="text"
                    value={day.title}
                    onChange={(e) => updateDay(day.id, 'title', e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  {!isExporting && (
                    <button
                      onClick={() => removeDay(day.id)}
                      className="bg-red-500 text-white px-2 py-1 rounded ml-2 hover:bg-red-600 text-sm"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <textarea
                  value={day.description}
                  onChange={(e) => updateDay(day.id, 'description', e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  rows="2"
                />
                <div className="mt-2">
                  <label className="block text-sm text-gray-600 mb-1">Change day image</label>
                  <input type="file" accept="image/*" onChange={(e) => handleDayImageChange(e, day.id)} />
                </div>
              </div>
            ))}
          </div>

          {/* Website */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Footer</h3>
            <input
              type="text"
              value={data.website}
              onChange={(e) => updateField('website', e.target.value)}
              placeholder="Website"
              className="w-full mb-3 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              value={data.address}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="Address"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="2"
            />
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-600 mb-1">Package Link</label>
              <input
                type="text"
                value={data.packageLink}
                onChange={(e) => attachPackageLink(e.target.value)}
                placeholder="https://..."
                className="w-full mb-2 px-3 py-2 border border-gray-300 rounded"
              />
            </div>
            <div className="mt-3">
              <h4 className="font-semibold mb-2">Similar Package Links</h4>
              {data.similarPackageLinks.map((link, idx) => (
                <div key={idx} className="mb-2">
                  <input
                    type="text"
                    value={link}
                    onChange={(e) => attachSimilarLink(idx, e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1">
        {/* Controls */}
        <div className="mb-6 flex gap-3">
          <button
            onClick={() => setShowPDFEditor(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 flex items-center gap-2 shadow-md"
          >
            <Edit size={20} /> Edit & Download PDF
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
            className="bg-white border-2 border-blue-600 text-blue-600 px-6 py-2 rounded-lg hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50"
          >
            <Download size={20} /> {pdfLoading ? 'Downloading...' : 'Quick Download'}
          </button>
          <button
            onClick={async () => {
              if (!printRef.current) return toast.error('Preview not ready');
              setPreviewLoading(true);
              try {
                await previewPDF(printRef.current);
              } catch (err) {
                console.error('Preview failed', err);
                toast.error('Failed to generate preview');
              } finally {
                setPreviewLoading(false);
              }
            }}
            disabled={previewLoading}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
          >
            {previewLoading ? 'Preparing...' : 'Preview PDF'}
          </button>
          <button
            onClick={() => setShowPanel(!showPanel)}
            className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2"
          >
            <Edit2 size={20} /> {showPanel ? 'Hide' : 'Show'} Panel
          </button>
        </div>

        {/* Template */}
        <div ref={printRef} className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
          <style>{`\n            .page { width:800px; background:white; padding-top: 0px; padding-right: 20px; padding-left: 20px; box-shadow:0 6px 20px rgba(0,0,0,0.08); color:#222; box-sizing:border-box; }\n            header{ display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; margin-bottom:18px; gap:16px; }\n            .company h1{ margin:0; font-size:20px; color:var(--accent);} \n            .meta{ font-size:15px; color:#666; }\n            .confirm-section { display: flex; justify-content: space-between; align-items: center; background: linear-gradient(90deg, #075056, #075056); color: #fff; font-weight: 700; font-size: 20px; padding: 18px 28px; border-radius: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.15); max-width: 100%; flex-wrap: wrap; }\n            .book-btn { background: #ff5b04; color: #fff; font-weight: 700; text-decoration: none; padding: 10px 24px; border-radius: 40px; font-family: 'Poppins', sans-serif; transition: background 0.3s, transform 0.2s; }\n            .book-btn:hover { transform: scale(1.05);} \n            .banner { width:100%; height:200px; border-radius:10px; overflow:hidden; margin-bottom:12px; border:1px solid #e2e2e2; display:flex; align-items:center; justify-content:center; background:#f6f9fb; }\n            .thumbs { display:flex; gap:8px; margin-top:8px; }\n            .thumb { width:32%; height:90px; border-radius:8px; overflow:hidden; border:1px solid #eee; background:#fff; display:flex; align-items:center; justify-content:center; }\n            .thumb img { width:100%; height:100%; object-fit:cover; display:block; }\n            .day-image { width:140px; height:90px; object-fit:cover; border-radius:8px; border:1px solid #ddd; margin-right:10px; }\n            .dayCard { display:flex; gap:12px; align-items:flex-start; }\n            .dayCard .dayContent { flex:1; }\n            .small-note { font-size:12px; color:#666; }\n            label.file-btn { background:#eee; color:#333; padding:6px 8px; border-radius:6px; cursor:pointer; display:inline-block; font-size:13px; }\n            @media (max-width:860px){ .page { width:96%; padding:18px; } .banner { height:160px; } .thumb { height:70px; } .day-image { display:none; } }\n          `}</style>
          {/* Header */}
          <header className="mb-8 pb-6 border-b-4 border-black">
            {/* Visible Page Title */}
            <div className="mb-3 text-center">
              <h3
                contentEditable={!isExporting}
                suppressContentEditableWarning
                onInput={(e) => onEditableInput('pageTitle', e)}
                className="text-xl text-gray-700 font-semibold"
                style={{ margin: 0 }}
              >
                {data.pageTitle}
              </h3>
            </div>
            <div className="flex gap-6 mb-6">
              <img
                src={data.companyLogo}
                alt="Logo"
                className="h-24 object-contain"
              />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 12 }}>
                <label htmlFor="logoUpload" className="file-btn no-print" style={{ display: isExporting ? 'none' : '' }}>Change Logo</label>
                <input id="logoUpload" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileChange(e, 'companyLogo')} />
              </div>
              <div>
                <h1
                  contentEditable={!isExporting}
                  suppressContentEditableWarning
                  onInput={(e) => onEditableInput('destination', e)}
                  className="text-5xl font-bold text-black"
                  style={{ fontFamily: "'The Season', serif", fontSize: 50, paddingLeft: 100 }}
                >
                  {data.destination}
                </h1>
              </div>
            </div>

            {/* Package Summary Section */}
            <div className="flex gap-6 mb-6">
              <div style={{ flex: 1, minWidth: 300 }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: 450, aspectRatio: '16/9', overflow: 'hidden', borderRadius: 16, border: '2px solid rgba(7,80,86,0.25)', cursor: 'pointer' }} onClick={() => document.getElementById('uploadImage')?.click()}>
                  <img
                    id="packageImage"
                    src={data.packageImage}
                    alt="Package"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <input id="uploadImage" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileChange(e, 'packageImage')} />
                </div>
              </div>
              <div className="flex-1">
                <h2
                  contentEditable={!isExporting}
                  suppressContentEditableWarning
                  onInput={(e) => onEditableInput('packageTitle', e)}
                  className="text-2xl font-bold text-black mb-4"
                >
                  {data.packageTitle}
                </h2>
                <p className="text-gray-700 mb-3" contentEditable={!isExporting} suppressContentEditableWarning onInput={(e) => onEditableInput('packageSummary', e)}>
                  {data.packageSummary}
                </p>
                <div className="space-y-3 text-sm text-blue-900">
                  <div>
                    <strong>Duration:</strong> {data.duration}
                  </div>
                  <div>
                    <strong>Price:</strong> ₹ {data.price} per person
                  </div>
                  <div>
                    <strong>Places Covered:</strong> <br /> {data.placesCovered}
                  </div>
                </div>
              </div>
            </div>
          </header>
          <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <a id="whatsapp1_small" href="#" target="_blank" rel="noreferrer" style={{ background: '#25D366', color: '#fff', padding: '6px 10px', borderRadius: 6, textDecoration: 'none' }}>WhatsApp 1</a>
            <a id="whatsapp2_small" href="#" target="_blank" rel="noreferrer" style={{ background: '#25D366', color: '#fff', padding: '6px 10px', borderRadius: 6, textDecoration: 'none' }}>WhatsApp 2</a>
          </div>

          {/* Confirm Section */}
          <div className="confirm-section" style={{ marginBottom: 20 }}>
            <span>To Confirm This Package, Click Here</span>
            <a id="bookNowBtn" href="#" className="book-btn" onClick={(e) => { e.preventDefault(); openWhatsApp(); }}>Book Now</a>
          </div>

          {/* Overview Section */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-black border-l-4 border-black pl-3 mb-4">Overview</h3>
            <div className="bg-blue-50 border-l-6 border-teal-900 p-4 rounded text-teal-900">
              <p className="mb-4" contentEditable={!isExporting} suppressContentEditableWarning onInput={(e) => onEditableInput('overview', e)}>{data.overview}</p>
              <div className="bg-blue-200 p-3 rounded">
                <h4 className="text-blue-900 font-bold mb-2">Package Highlights</h4>
                <ul className="list-disc list-inside space-y-1 text-blue-900">
                  {data.highlights.map((h, i) => (
                      <li key={i} contentEditable={!isExporting} suppressContentEditableWarning onInput={(e) => onEditableInput(`highlights.${i}`, e)}>{h}</li>
                    ))}
                </ul>
              </div>
            </div>
          </section>
          {/* Package link input & view button (like itt.html) */}
          <div id="linkSection" style={{ textAlign: 'center', marginBottom: 12 }}>
              <input
                type="text"
                id="linkInput"
                className="no-print"
              placeholder="Enter package URL here..."
              style={{ width: '70%', maxWidth: 400, padding: '8px 10px', border: '2px solid black', borderRadius: 6, outline: 'none' }}
              defaultValue={data.packageLink}
            />
            <button
              onClick={() => {
                const input = document.getElementById('linkInput');
                if (input && input.value.trim()) {
                  attachPackageLink(input.value.trim());
                  input.style.display = 'none';
                  alert('✅ Link attached successfully!');
                } else {
                  alert('⚠️ Please enter a valid link first.');
                }
              }}
              style={{ display: isExporting ? 'none' : '', background: 'black', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: 6, marginLeft: 6, cursor: 'pointer', fontWeight: 600 }}
              className="no-print"
            >
              Attach Link
            </button>
          </div>

          {/* Accommodation Section */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-black border-l-4 border-black pl-3 mb-4">Accommodation Details</h3>
            <div className="flex gap-6">
              <div className="flex-1">
                <div className="space-y-3 text-sm text-teal-900">
                  <div>
                    <strong>Room Category:</strong> {data.accommodation.roomCategory}
                  </div>
                  <div>
                    <strong>Meal Plan:</strong> {data.accommodation.mealPlan}
                  </div>
                  <div>
                    <strong>Note:</strong> {data.accommodation.note}
                  </div>
                </div>
              </div>
              <img
                src={data.packageImage}
                alt="Accommodation"
                className="w-80 h-56 object-cover rounded-lg border-2 border-teal-900"
              />
            </div>
          </section>

          {/* Itinerary Section */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-black border-l-4 border-black pl-3 mb-4">Day-wise Itinerary</h3>
            <div>
              <div className="controls" style={{ marginBottom: 10 }}>
                {!isExporting && (
                  <button id="addDayBtn" onClick={addDay} style={{ background: '#0288d1', color: '#fff', padding: '8px 12px', borderRadius: 6 }}>+ Add New Day</button>
                )}
              </div>
              <div className="space-y-4">
                {data.days.map((day) => (
                  <div key={day.id} className="dayCard" style={{ background: '#e4eef0', borderLeft: '6px solid #f57c00', padding: 14, borderRadius: 8, marginBottom: 10 }}>
                    <div style={{ display: 'flex', width: '100%', gap: 12 }}>
                      <img src={day.image} alt={day.title} className="day-image" />
                      <div className="dayContent">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 contentEditable={!isExporting} suppressContentEditableWarning onInput={(e) => updateDay(day.id, 'title', e.currentTarget.innerText)} style={{ color: '#e65100', margin: 0 }}>{day.title}</h4>
                          <div>
                            <label className="file-btn no-print" htmlFor={`dayImgUpload_${day.id}`} style={{ display: isExporting ? 'none' : '' }}>Change image</label>
                            {!isExporting && (
                              <button className="delete-button no-print" onClick={() => removeDay(day.id)} style={{ background: '#d32f2f', marginLeft: 8, color: '#fff', padding: '6px 10px', borderRadius: 6 }}>Delete</button>
                            )}
                          </div>
                        </div>
                        <p contentEditable={!isExporting} suppressContentEditableWarning onInput={(e) => updateDay(day.id, 'description', e.currentTarget.innerText)} style={{ marginTop: 8 }}>{day.description}</p>
                        <input id={`dayImgUpload_${day.id}`} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleDayImageChange(e, day.id)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Inclusions & Exclusions */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-black border-l-4 border-black pl-3 mb-4">Inclusions & Exclusions</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-teal-50 border-l-6 border-teal-700 p-4 rounded">
                <h4 className="text-teal-900 font-bold mb-3">✅ What's Included</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-teal-900">
                  {data.inclusions.map((i, idx) => (
                    <li key={idx} contentEditable={!isExporting} suppressContentEditableWarning onInput={(e) => onEditableInput(`inclusions.${idx}`, e)}>{i}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-red-50 border-l-6 border-red-700 p-4 rounded">
                <h4 className="text-red-900 font-bold mb-3">❌ What's Not Included</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-900">
                  {data.exclusions.map((e, idx) => (
                    <li key={idx} contentEditable={!isExporting} suppressContentEditableWarning onInput={(e) => onEditableInput(`exclusions.${idx}`, e)}>{e}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Terms & Conditions */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-black border-l-4 border-black pl-3 mb-4">Terms & Conditions</h3>
            <div className="bg-blue-50 border-l-6 border-black p-4 rounded">
              <ul className="list-disc list-inside space-y-2 text-sm text-gray-800">
                {data.terms.map((t, i) => (
                  <li key={i} contentEditable={!isExporting} suppressContentEditableWarning onInput={(e) => onEditableInput(`terms.${i}`, e)}>{t}</li>
                ))}
              </ul>
            </div>
          </section>

          {/* NEW: Recommended Activities Section */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-black border-l-4 border-orange-500 pl-3 mb-4">Recommended Activities</h3>
            <div className="bg-orange-50 border-l-6 border-orange-500 p-4 rounded">
              <p className="text-teal-900 mb-4 text-sm">
                Enhance your experience with these carefully selected activities designed to make your trip unforgettable:
              </p>
              <div className="grid grid-cols-2 gap-4">
                {data.recommendedActivities.map((activity) => (
                  <div key={activity.id} className="bg-white rounded-lg p-3 shadow-md border border-orange-200">
                    <div className="flex items-start gap-3">
                      <div className="text-3xl flex-shrink-0">{activity.icon}</div>
                      <div className="flex-1">
                        <h4 contentEditable={!isExporting} suppressContentEditableWarning onInput={(e) => {
                          const updated = data.recommendedActivities.map(a => 
                            a.id === activity.id ? {...a, title: e.currentTarget.innerText} : a
                          );
                          updateField('recommendedActivities', updated);
                        }} className="text-teal-900 font-semibold text-sm mb-1">
                          {activity.title}
                        </h4>
                        <p contentEditable={!isExporting} suppressContentEditableWarning onInput={(e) => {
                          const updated = data.recommendedActivities.map(a => 
                            a.id === activity.id ? {...a, description: e.currentTarget.innerText} : a
                          );
                          updateField('recommendedActivities', updated);
                        }} className="text-gray-600 text-xs leading-tight">
                          {activity.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 bg-blue-100 p-3 rounded text-center">
                <p className="text-blue-900 text-sm font-semibold">
                  💡 Tip: These activities can be added to your package. Contact us for customization!
                </p>
              </div>
            </div>
          </section>

          {/* NEW: Customer Feedback Section */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-black border-l-4 border-teal-700 pl-3 mb-4">Customer Feedback</h3>
            <div className="bg-green-50 border-l-6 border-teal-700 p-4 rounded">
              <div className="flex items-start gap-3 mb-4">
                <div className="text-4xl">✍️</div>
                <div className="flex-1">
                  <h4 className="text-teal-900 font-bold text-base mb-2">We Value Your Feedback!</h4>
                  <p className="text-teal-900 text-sm mb-3">
                    Your experience matters to us. Please share your thoughts, suggestions, or any special requests:
                  </p>
                </div>
              </div>
              <div className="bg-white border-2 border-teal-700 rounded-lg p-4 min-h-24 relative">
                <div 
                  contentEditable={!isExporting}
                  suppressContentEditableWarning
                  onInput={(e) => updateField('feedbackText', e.currentTarget.innerText)}
                  className="text-gray-600 text-sm leading-relaxed min-h-20 outline-none">
                  {data.feedbackText}
                </div>
                <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                  Click to edit and add your feedback...
                </div>
              </div>
              <div className="mt-3 flex gap-2 flex-wrap justify-center">
                <span className="bg-teal-100 text-teal-900 px-3 py-1 rounded-full text-xs font-semibold">⭐ Rate us: ⭐⭐⭐⭐⭐</span>
                <span className="bg-teal-100 text-teal-900 px-3 py-1 rounded-full text-xs font-semibold">📧 Email: feedback@traverseglobe.com</span>
              </div>
            </div>
          </section>

          {/* Similar Packages */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-teal-900 text-center mb-6">Similar Packages You May Like</h2>
            <div className="grid grid-cols-4 gap-4">
              {data.similarPackages.map((pkg, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
                  <img
                    src={data.packageImage}
                    alt="Package"
                    className="w-full h-20 object-cover"
                  />
                  <div className="p-3">
                    <h3 className="font-bold text-teal-900 text-sm mb-2" contentEditable={!isExporting} suppressContentEditableWarning onInput={(e) => updateField(`similarPackages.${i}.title`, e.currentTarget.innerText)}>{pkg.title}</h3>
                    <p className="font-semibold text-black mb-3" contentEditable={!isExporting} suppressContentEditableWarning onInput={(e) => updateField(`similarPackages.${i}.price`, e.currentTarget.innerText)}>₹{pkg.price} / person</p>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Enter package URL here..."
                        className="no-print"
                        value={data.similarPackageLinks && data.similarPackageLinks[i] ? data.similarPackageLinks[i] : ''}
                        onChange={(e) => updateField(`similarPackageLinks.${i}`, e.target.value)}
                        style={{ display: isExporting ? 'none' : '', width: '60%', padding: '8px 10px', border: '2px solid black', borderRadius: 6 }}
                        disabled={isExporting}
                      />
                      <a
                        href={data.similarPackageLinks && data.similarPackageLinks[i] ? data.similarPackageLinks[i] : (data.packageLink || '#')}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-center bg-gradient-to-r from-black to-blue-800 text-white text-sm px-3 py-1 rounded"
                        style={{ width: '40%', display: 'inline-block' }}
                      >
                        View Package
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Enhanced Footer with Social Media & Contact Details */}
          <footer className="mt-6 bg-gradient-to-r from-teal-800 to-teal-900 -mx-8 px-8 py-6 text-white">
            <div className="max-w-6xl mx-auto">
              {/* Top Section - Company Info */}
              <div className="grid grid-cols-3 gap-6 mb-6">
                {/* Company Column */}
                <div>
                  <h4 contentEditable={!isExporting} suppressContentEditableWarning className="text-white font-bold text-base mb-3 border-b-2 border-orange-500 pb-2 inline-block">
                    Traverse Globe
                  </h4>
                  <p contentEditable={!isExporting} suppressContentEditableWarning className="text-teal-100 text-xs leading-relaxed">
                    Your trusted travel partner for unforgettable journeys around the world. Creating memories, one destination at a time.
                  </p>
                </div>

                {/* Contact Column */}
                <div>
                  <h4 className="text-white font-bold text-base mb-3 border-b-2 border-orange-500 pb-2 inline-block">
                    Contact Us
                  </h4>
                  <div className="text-xs leading-relaxed text-teal-100 space-y-1">
                    <div>📍 <span contentEditable={!isExporting} suppressContentEditableWarning>{data.address}</span></div>
                    <div>📧 <a href="mailto:info@traverseglobe.com" className="text-white font-semibold hover:underline">info@traverseglobe.com</a></div>
                    <div>📞 <span contentEditable={!isExporting} suppressContentEditableWarning>+91 99970 85457 | +91 95202 32324</span></div>
                    <div>🌐 <a href={`https://${data.website}`} target="_blank" rel="noopener noreferrer" className="text-white font-semibold hover:underline">{data.website}</a></div>
                  </div>
                </div>

                {/* Social Media Column */}
                <div>
                  <h4 className="text-white font-bold text-base mb-3 border-b-2 border-orange-500 pb-2 inline-block">
                    Follow Us
                  </h4>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <a href="https://www.facebook.com/traverseglobe" target="_blank" rel="noopener noreferrer" className="bg-white text-teal-900 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg hover:bg-orange-500 hover:text-white transition-all shadow-md">
                      f
                    </a>
                    <a href="https://www.instagram.com/traverseglobe" target="_blank" rel="noopener noreferrer" className="bg-white text-teal-900 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg hover:bg-orange-500 hover:text-white transition-all shadow-md">
                      📷
                    </a>
                    <a href="https://twitter.com/traverseglobe" target="_blank" rel="noopener noreferrer" className="bg-white text-teal-900 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg hover:bg-orange-500 hover:text-white transition-all shadow-md">
                      🐦
                    </a>
                    <a href="https://www.linkedin.com/company/traverseglobe" target="_blank" rel="noopener noreferrer" className="bg-white text-teal-900 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg hover:bg-orange-500 hover:text-white transition-all shadow-md">
                      in
                    </a>
                    <a href="https://wa.me/919997085457" target="_blank" rel="noopener noreferrer" className="bg-green-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg hover:bg-green-600 transition-all shadow-md">
                      💬
                    </a>
                    <a href="https://www.youtube.com/@traverseglobe" target="_blank" rel="noopener noreferrer" className="bg-white text-teal-900 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg hover:bg-orange-500 hover:text-white transition-all shadow-md">
                      ▶️
                    </a>
                  </div>
                  <p className="mt-3 text-xs text-teal-100">Stay connected for exclusive deals!</p>
                </div>
              </div>

              {/* Bottom Section - Legal & Copyright */}
              <div className="border-t border-teal-700 pt-4 flex justify-between items-center flex-wrap gap-3 text-xs text-teal-200">
                <div>
                  <span contentEditable={!isExporting} suppressContentEditableWarning>© 2024 Traverse Globe. All rights reserved.</span>
                </div>
                <div className="flex gap-4 flex-wrap">
                  <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                  <a href="#" className="hover:text-white transition-colors">Terms & Conditions</a>
                  <a href="#" className="hover:text-white transition-colors">Cancellation Policy</a>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="mt-4 flex justify-center gap-4 flex-wrap text-xs text-teal-200">
                <div className="flex items-center gap-2 bg-teal-700 bg-opacity-50 px-3 py-1.5 rounded-full">
                  <span>✅</span> <span>IATA Certified</span>
                </div>
                <div className="flex items-center gap-2 bg-teal-700 bg-opacity-50 px-3 py-1.5 rounded-full">
                  <span>🛡️</span> <span>100% Secure Booking</span>
                </div>
                <div className="flex items-center gap-2 bg-teal-700 bg-opacity-50 px-3 py-1.5 rounded-full">
                  <span>⭐</span> <span>4.8/5 Rating</span>
                </div>
                <div className="flex items-center gap-2 bg-teal-700 bg-opacity-50 px-3 py-1.5 rounded-full">
                  <span>🏆</span> <span>Award Winning Service</span>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
      </div>

      {/* PDF Editor Modal */}
      <PDFEditorModal
        isOpen={showPDFEditor}
        onClose={() => setShowPDFEditor(false)}
        element={printRef?.current}
        filename={`${data.pageTitle?.replace(/\s+/g, '_') || data.packageTitle?.replace(/\s+/g, '_') || 'package'}_${new Date().toISOString().split('T')[0]}.pdf`}
        onDownload={async (element, filename, config) => {
          setPdfDownloading(true);
          try {
            await downloadPDF(element, filename, config);
            toast.success('PDF downloaded successfully!');
          } catch (error) {
            console.error('PDF download failed:', error);
            toast.error('Failed to download PDF. Please try again.');
          } finally {
            setPdfDownloading(false);
          }
        }}
      />
    </div>
  );
};

export default EditableQuotationTemplate;
