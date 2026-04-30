import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { propertyAPI, uploadAPI } from '../services/api';
import toast from 'react-hot-toast';
import './ListingFormPage.css';

const PROPERTY_TYPES = ['house', 'apartment', 'condo', 'townhouse', 'villa', 'land', 'commercial', 'office'];
const AMENITIES_LIST = [
  'Swimming Pool', 'Gym', 'Parking', 'Garden', 'Fireplace', 'Balcony',
  'Smart Home', 'Elevator', 'Concierge', 'Pet Friendly', 'Security System',
  'Air Conditioning', 'Heating', 'Laundry', 'Storage', 'Rooftop Access',
  'Home Theater', 'Wine Cellar', 'Beach Access', 'Lake View', 'City Views',
];

const STEPS = ['Basic Info', 'Location', 'Details', 'Media', 'Review'];

function ListingFormPage({ editMode = false }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(editMode);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const photoInputRef = useRef();
  const floorplanInputRef = useRef();

  const [form, setForm] = useState({
    title: '', description: '', propertyType: 'house', listingType: 'sale',
    price: '', bedrooms: '', bathrooms: '', garages: '', area: '',
    lotSize: '', yearBuilt: '', floors: '1', furnished: 'unfurnished',
    street: '', city: '', state: '', zipCode: '', country: 'USA',
    latitude: '', longitude: '', neighborhood: '',
    amenities: [],
    virtualTourUrl: '', videoUrl: '',
    photos: [],       // [{url, publicId, isPrimary, caption}]
    floorPlanUrl: '',
    floorPlanPublicId: '',
    hoaFees: '', propertyTax: '',
  });

  useEffect(() => {
    if (editMode && id) {
      propertyAPI.getOne(id).then(({ data }) => {
        const [lng, lat] = data.location.coordinates;
        setForm({
          title: data.title || '', description: data.description || '',
          propertyType: data.propertyType || 'house', listingType: data.listingType || 'sale',
          price: data.price || '', bedrooms: data.bedrooms || '', bathrooms: data.bathrooms || '',
          garages: data.garages || '', area: data.area || '', lotSize: data.lotSize || '',
          yearBuilt: data.yearBuilt || '', floors: data.floors || '1',
          furnished: data.furnished || 'unfurnished',
          street: data.address?.street || '', city: data.address?.city || '',
          state: data.address?.state || '', zipCode: data.address?.zipCode || '',
          country: data.address?.country || 'USA',
          latitude: lat || '', longitude: lng || '',
          neighborhood: data.neighborhood || '',
          amenities: data.amenities || [],
          virtualTourUrl: data.virtualTourUrl || '', videoUrl: data.videoUrl || '',
          photos: data.photos || [],
          floorPlanUrl: data.floorPlanUrl || '', floorPlanPublicId: data.floorPlanPublicId || '',
          hoaFees: data.hoaFees || '', propertyTax: data.propertyTax || '',
        });
        setLoading(false);
      }).catch(() => { toast.error('Property not found'); navigate('/agent/dashboard'); });
    }
  }, [editMode, id, navigate]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const toggleAmenity = (amenity) => {
    setForm(f => ({
      ...f,
      amenities: f.amenities.includes(amenity)
        ? f.amenities.filter(a => a !== amenity)
        : [...f.amenities, amenity],
    }));
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingPhotos(true);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('photos', f));
      const { data } = await uploadAPI.photos(fd);
      const newPhotos = data.files.map((f, i) => ({
        url: f.url, publicId: f.publicId,
        isPrimary: form.photos.length === 0 && i === 0,
        caption: '',
      }));
      setForm(f => ({ ...f, photos: [...f.photos, ...newPhotos] }));
      toast.success(`${files.length} photo(s) uploaded`);
    } catch {
      toast.error('Photo upload failed');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleFloorplanUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('floorplan', file);
      const { data } = await uploadAPI.floorplan(fd);
      set('floorPlanUrl', data.url);
      set('floorPlanPublicId', data.publicId);
      toast.success('Floor plan uploaded');
    } catch {
      toast.error('Floor plan upload failed');
    }
  };

  const removePhoto = (idx) => {
    setForm(f => {
      const photos = [...f.photos];
      photos.splice(idx, 1);
      if (photos.length && !photos.some(p => p.isPrimary)) photos[0].isPrimary = true;
      return { ...f, photos };
    });
  };

  const setPrimaryPhoto = (idx) => {
    setForm(f => ({
      ...f,
      photos: f.photos.map((p, i) => ({ ...p, isPrimary: i === idx })),
    }));
  };

  const handleSubmit = async () => {
    if (!form.title || !form.price || !form.street || !form.city || !form.latitude) {
      toast.error('Please fill in all required fields'); return;
    }
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (editMode) {
        await propertyAPI.update(id, payload);
        toast.success('Listing updated!');
      } else {
        const { data } = await propertyAPI.create(payload);
        // Upload photos if any were attached before create
        if (form.photos.length && data._id) {
          // Photos were already uploaded to Cloudinary; patch them in
          await propertyAPI.update(data._id, { photos: form.photos });
        }
        toast.success('Listing created!');
      }
      navigate('/agent/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  const canNext = () => {
    if (step === 0) return form.title && form.description && form.propertyType && form.listingType && form.price;
    if (step === 1) return form.street && form.city && form.state && form.zipCode && form.latitude && form.longitude;
    return true;
  };

  if (loading) return <div className="loading-screen" style={{ minHeight: '80vh' }}><div className="spinner" /></div>;

  return (
    <div className="listing-form-page">
      <div className="container">
        <div className="lf-header">
          <h1>{editMode ? 'Edit Listing' : 'Create New Listing'}</h1>
          <p>{editMode ? 'Update your property information' : 'List your property on EstateHub'}</p>
        </div>

        {/* Step indicator */}
        <div className="step-indicator">
          {STEPS.map((s, i) => (
            <div key={i} className={`step-item ${step === i ? 'active' : ''} ${step > i ? 'done' : ''}`}>
              <div className="step-num">{step > i ? '✓' : i + 1}</div>
              <div className="step-name">{s}</div>
              {i < STEPS.length - 1 && <div className="step-line" />}
            </div>
          ))}
        </div>

        <div className="lf-body">
          {/* ── STEP 0: Basic Info ── */}
          {step === 0 && (
            <div className="form-section animate-fade">
              <h2>Basic Information</h2>

              <div className="form-group">
                <label className="form-label">Listing Title *</label>
                <input className="form-input" placeholder="e.g. Stunning Modern Villa with Pool" value={form.title} onChange={e => set('title', e.target.value)} />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Property Type *</label>
                  <div className="type-grid">
                    {PROPERTY_TYPES.map(t => (
                      <button key={t} type="button" className={`type-btn-sm ${form.propertyType === t ? 'active' : ''}`} onClick={() => set('propertyType', t)}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Listing Type *</label>
                  <div className="listing-toggle">
                    <button type="button" className={`lt-btn ${form.listingType === 'sale' ? 'active' : ''}`} onClick={() => set('listingType', 'sale')}>🏷️ For Sale</button>
                    <button type="button" className={`lt-btn ${form.listingType === 'rent' ? 'active' : ''}`} onClick={() => set('listingType', 'rent')}>🔑 For Rent</button>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Price * {form.listingType === 'rent' && '(per month)'}</label>
                <div className="input-prefix">
                  <span>$</span>
                  <input className="form-input" type="number" placeholder="0" value={form.price} onChange={e => set('price', e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description *</label>
                <textarea className="form-textarea" rows={6} placeholder="Describe the property in detail..." value={form.description} onChange={e => set('description', e.target.value)} />
                <span className="char-count">{form.description.length}/5000</span>
              </div>
            </div>
          )}

          {/* ── STEP 1: Location ── */}
          {step === 1 && (
            <div className="form-section animate-fade">
              <h2>Property Location</h2>
              <div className="form-group">
                <label className="form-label">Street Address *</label>
                <input className="form-input" placeholder="123 Main Street" value={form.street} onChange={e => set('street', e.target.value)} />
              </div>
              <div className="form-row-3">
                <div className="form-group">
                  <label className="form-label">City *</label>
                  <input className="form-input" placeholder="New York" value={form.city} onChange={e => set('city', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">State *</label>
                  <input className="form-input" placeholder="NY" value={form.state} onChange={e => set('state', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">ZIP Code *</label>
                  <input className="form-input" placeholder="10001" value={form.zipCode} onChange={e => set('zipCode', e.target.value)} />
                </div>
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Country</label>
                  <input className="form-input" value={form.country} onChange={e => set('country', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Neighborhood</label>
                  <input className="form-input" placeholder="e.g. Midtown East" value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)} />
                </div>
              </div>
              <div className="coords-note">
                <p>📍 Enter coordinates for map display. Use <a href="https://www.latlong.net/" target="_blank" rel="noreferrer">latlong.net</a> to find your property's coordinates.</p>
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Latitude *</label>
                  <input className="form-input" type="number" step="any" placeholder="e.g. 40.7128" value={form.latitude} onChange={e => set('latitude', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Longitude *</label>
                  <input className="form-input" type="number" step="any" placeholder="e.g. -74.0060" value={form.longitude} onChange={e => set('longitude', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Details ── */}
          {step === 2 && (
            <div className="form-section animate-fade">
              <h2>Property Details</h2>
              <div className="form-row-3">
                <div className="form-group">
                  <label className="form-label">Bedrooms</label>
                  <input className="form-input" type="number" min="0" placeholder="0" value={form.bedrooms} onChange={e => set('bedrooms', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Bathrooms</label>
                  <input className="form-input" type="number" min="0" step="0.5" placeholder="0" value={form.bathrooms} onChange={e => set('bathrooms', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Garages</label>
                  <input className="form-input" type="number" min="0" placeholder="0" value={form.garages} onChange={e => set('garages', e.target.value)} />
                </div>
              </div>
              <div className="form-row-3">
                <div className="form-group">
                  <label className="form-label">Living Area (sq ft)</label>
                  <input className="form-input" type="number" min="0" placeholder="0" value={form.area} onChange={e => set('area', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Lot Size (sq ft)</label>
                  <input className="form-input" type="number" min="0" placeholder="0" value={form.lotSize} onChange={e => set('lotSize', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Year Built</label>
                  <input className="form-input" type="number" min="1800" max={new Date().getFullYear()} placeholder="2020" value={form.yearBuilt} onChange={e => set('yearBuilt', e.target.value)} />
                </div>
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Floors</label>
                  <input className="form-input" type="number" min="1" placeholder="1" value={form.floors} onChange={e => set('floors', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Furnished</label>
                  <select className="form-select" value={form.furnished} onChange={e => set('furnished', e.target.value)}>
                    <option value="unfurnished">Unfurnished</option>
                    <option value="semi-furnished">Semi-Furnished</option>
                    <option value="fully-furnished">Fully Furnished</option>
                    <option value="not-applicable">Not Applicable</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Amenities</label>
                <div className="amenities-selector">
                  {AMENITIES_LIST.map(a => (
                    <button key={a} type="button" className={`amenity-toggle ${form.amenities.includes(a) ? 'active' : ''}`} onClick={() => toggleAmenity(a)}>
                      {form.amenities.includes(a) ? '✓ ' : ''}{a}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">HOA Fees ($/mo)</label>
                  <div className="input-prefix"><span>$</span><input className="form-input" type="number" min="0" value={form.hoaFees} onChange={e => set('hoaFees', e.target.value)} /></div>
                </div>
                <div className="form-group">
                  <label className="form-label">Property Tax ($/yr)</label>
                  <div className="input-prefix"><span>$</span><input className="form-input" type="number" min="0" value={form.propertyTax} onChange={e => set('propertyTax', e.target.value)} /></div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Media ── */}
          {step === 3 && (
            <div className="form-section animate-fade">
              <h2>Photos & Media</h2>

              <div className="upload-zone" onClick={() => photoInputRef.current.click()}>
                <input ref={photoInputRef} type="file" accept="image/*" multiple hidden onChange={handlePhotoUpload} />
                {uploadingPhotos ? (
                  <div><div className="spinner" /><p>Uploading…</p></div>
                ) : (
                  <>
                    <div className="upload-icon">📸</div>
                    <div className="upload-text">Click to upload photos</div>
                    <div className="upload-sub">JPG, PNG, WebP · Max 10MB each · Up to 20 photos</div>
                  </>
                )}
              </div>

              {form.photos.length > 0 && (
                <div className="photo-preview-grid">
                  {form.photos.map((photo, i) => (
                    <div key={i} className={`preview-item ${photo.isPrimary ? 'primary' : ''}`}>
                      <img src={photo.url} alt="" />
                      <div className="preview-actions">
                        <button onClick={() => setPrimaryPhoto(i)} className="preview-btn" title="Set as primary">⭐</button>
                        <button onClick={() => removePhoto(i)} className="preview-btn delete" title="Remove">✕</button>
                      </div>
                      {photo.isPrimary && <div className="primary-badge">Primary</div>}
                    </div>
                  ))}
                </div>
              )}

              <div className="form-group" style={{ marginTop: 24 }}>
                <label className="form-label">Floor Plan</label>
                <div className="floorplan-upload">
                  <input ref={floorplanInputRef} type="file" accept="image/*,application/pdf" hidden onChange={handleFloorplanUpload} />
                  {form.floorPlanUrl ? (
                    <div className="floorplan-preview">
                      <img src={form.floorPlanUrl} alt="Floor plan" />
                      <button onClick={() => { set('floorPlanUrl', ''); set('floorPlanPublicId', ''); }} className="btn btn-ghost btn-sm">Remove</button>
                    </div>
                  ) : (
                    <button type="button" className="btn btn-ghost" onClick={() => floorplanInputRef.current.click()}>📐 Upload Floor Plan</button>
                  )}
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Virtual Tour URL</label>
                  <input className="form-input" type="url" placeholder="https://matterport.com/..." value={form.virtualTourUrl} onChange={e => set('virtualTourUrl', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Video URL</label>
                  <input className="form-input" type="url" placeholder="https://youtube.com/..." value={form.videoUrl} onChange={e => set('videoUrl', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4: Review ── */}
          {step === 4 && (
            <div className="form-section animate-fade">
              <h2>Review & Publish</h2>
              <div className="review-grid">
                <ReviewItem label="Title" value={form.title} />
                <ReviewItem label="Type" value={`${form.propertyType} · ${form.listingType}`} />
                <ReviewItem label="Price" value={`$${Number(form.price).toLocaleString()}${form.listingType === 'rent' ? '/mo' : ''}`} />
                <ReviewItem label="Address" value={`${form.street}, ${form.city}, ${form.state} ${form.zipCode}`} />
                <ReviewItem label="Coordinates" value={`${form.latitude}, ${form.longitude}`} />
                <ReviewItem label="Bedrooms / Bathrooms" value={`${form.bedrooms || 0} / ${form.bathrooms || 0}`} />
                <ReviewItem label="Area" value={form.area ? `${Number(form.area).toLocaleString()} sq ft` : 'N/A'} />
                <ReviewItem label="Photos" value={`${form.photos.length} uploaded`} />
                <ReviewItem label="Floor Plan" value={form.floorPlanUrl ? 'Uploaded' : 'None'} />
                <ReviewItem label="Virtual Tour" value={form.virtualTourUrl || 'None'} />
                <ReviewItem label="Amenities" value={form.amenities.length ? form.amenities.join(', ') : 'None'} />
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="form-nav">
            {step > 0 && (
              <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)}>← Back</button>
            )}
            <div style={{ flex: 1 }} />
            {step < STEPS.length - 1 ? (
              <button className="btn btn-primary" onClick={() => setStep(s => s + 1)} disabled={!canNext()}>
                Continue →
              </button>
            ) : (
              <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> Saving…</> : editMode ? '💾 Update Listing' : '🚀 Publish Listing'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewItem({ label, value }) {
  return (
    <div className="review-item">
      <span className="review-label">{label}</span>
      <span className="review-value">{value}</span>
    </div>
  );
}

export function CreateListingPage() { return <ListingFormPage editMode={false} />; }
export function EditListingPage() { return <ListingFormPage editMode={true} />; }
export default ListingFormPage;
