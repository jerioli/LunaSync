import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {Accordion,AccordionItem,AccordionTrigger,AccordionContent,} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue,} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle,} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { ArrowLeft, X, Calendar as CalendarIcon, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Checkbox } from "@/components/ui/checkbox";

const AddPatient = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', gender: '', age: '', address: '', dateOfBirth: '', email: '', phone: '', religion: '',
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const handleChange = (field, value) => {setForm((prev) => ({ ...prev, [field]: value }));
  };
  const [medicalHistory, setMedicalHistory] = useState({
    chiefComplaint: ''
  });
  const handleHistoryChange = (field, value) => {
    setMedicalHistory(prev => {
      if (value === undefined) {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      }
      return { ...prev, [field]: value };
    });
  };
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  type PrescriptionData = {
    nameType?: string;
    name?: string;
    dose?: string;
    quantity?: string;
    frequency?: string;
    customFrequency?: string;
    startDate?: string;
    endDate?: string;
    notes?: string;
    favorite?: boolean;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
  };
  const [templateData, setTemplateData] = useState<PrescriptionData>({});
  const [currentPrescriptionTab, setCurrentPrescriptionTab] = useState('New');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [favoriteTemplates, setFavoriteTemplates] = useState<any[]>([]);

  const personalRef = useRef(null);
  const examRef = useRef(null);
  const historyRef = useRef(null);

  const scrollTo = (ref) => ref.current?.scrollIntoView({ behavior: 'smooth' });
  const [activeTab, setActiveTab] = useState<'personal' | 'exam' | 'history'>('personal');

  const [prescriptionErrors, setPrescriptionErrors] = useState<{ [key: string]: string }>({});
  const [personalErrors, setPersonalErrors] = useState<{ [key: string]: string }>({});

  const handleTemplateSave = () => {
    if (selectedTemplate === "E-Prescription") {
      const requiredFields = [
        "nameType",
        "name",
        "dose",
        "quantity",
        "frequency",
        "startDate",
        "endDate",
        "notes",
      ];
      const errors: { [key: string]: string } = {};
      requiredFields.forEach((field) => {
        if (
          !templateData[field] ||
          (field === "frequency" &&
            templateData.frequency === "custom" &&
            !templateData.customFrequency)
        ) {
          errors[field] = "Required";
        }
      });
      // Special check for custom frequency
      if (
        templateData.frequency === "custom" &&
        !templateData.customFrequency
      ) {
        errors["customFrequency"] = "Required";
      }
      setPrescriptionErrors(errors);
      if (Object.keys(errors).length > 0) return;
    }
    setPrescriptionErrors({});
    setTemplates((prev) => [...prev, { type: selectedTemplate, data: templateData }]);
    if (templateData.favorite) {
      setFavoriteTemplates((prev) => [...prev, { ...templateData }]);
    }
    setTemplateData({});
    setSelectedTemplate('');

    if (templateData.nameType === "Generic") {
    setGenericTemplates(prev => [...prev, { ...templateData }]);
  } else if (templateData.nameType === "Brand") {
    setBrandTemplates(prev => [...prev, { ...templateData }]);
  }
  };
  const handlePrescriptionChange = (field, value) => {
    setTemplateData((prev) => ({ ...prev, [field]: value }));
    // Clear the error for this field as soon as user types
    setPrescriptionErrors((prev) => {
      if (!prev[field]) return prev;
      const updated = { ...prev };
      // For customFrequency, also clear frequency error if needed
      if (field === "customFrequency") {
        delete updated["customFrequency"];
        delete updated["frequency"];
      } else {
        delete updated[field];
      }
      return updated;
    });
  };
  const handleEditTemplate = (index) => {
    setSelectedTemplate(templates[index].type);
    setTemplateData(templates[index].data);
    setTemplates((prev) => prev.filter((_, i) => i !== index));
  };
  const placeholders: Record<string, string> = {chiefComplaint: 'Write here the complaint', illnesses: 'List any illnesses', surgeries: 'List any surgeries', allergies: 'List any allergies', medications: 'List any medications', familyHistory: 'Describe family medical history', socialHistory: 'Describe social history',
  };
  const handleDeleteTemplate = () => {
    setTemplates((prev) => prev.filter((_, i) => i !== deleteIndex));
    setShowDeleteConfirm(false);
  };
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const handleSaveAll = () => {
    console.log({ personal: form, history: medicalHistory, templates });
    navigate('/patients');
  };
  const initialPrescriptionData = {nameType: '', name: '', dose: '', quantity: '', frequency: '', startDate: '', endDate: '', notes: '',
    favorite: false,
  };
  const TEMPLATE_OPTIONS = [
    { value: "SOAP Note", label: "SOAP Note" },
    { value: "Blank", label: "Blank" },
    { value: "E-prescription", label: "E-prescription" },
  ];
  const [showForm, setShowForm] = React.useState(false);
  const [formData, setFormData] = React.useState({name: '', dose: '', quantity: '', frequency: '', startDate: '', endDate: '', notes: '',
  });
  const [genericTemplates, setGenericTemplates] = useState<any[]>([]);
  const [brandTemplates, setBrandTemplates] = useState<any[]>([]);
  const [pendingUncheckField, setPendingUncheckField] = useState<string | null>(null);

  return (
      <div className="flex flex-col h-screen">
          <div className="flex justify-between items-center pb-4 px-8 border-b h-20">
            <h1 className="text-3xl font-bold">Add New Patient</h1>
            <button onClick={() => navigate('/patients')} className="text-[#1EAEDB] hover:underline">◄ Back to Patients List</button>
          </div>

          <Card className="h-[82vh] flex flex-col">
              <CardHeader className="border-b">
                <nav className="flex justify-around items-center">
                  <ul className="flex gap-10 text-base">
                    <li>
                      <button onClick={() => {setActiveTab('personal'); scrollTo(personalRef);}}
                          className={`hover:text-[#1EAEDB] text-1xl font-bold ${
                          activeTab === 'personal' ? 'text-[#1EAEDB] underline underline-offset-8 decoration-2 decoration-[#1EAEDB]' : ''
                        }`}>Personal Information
                      </button>
                    </li>
                    <li>
                      <button onClick={() => {setActiveTab('exam'); scrollTo(examRef);}}
                          className={`hover:text-[#1EAEDB] text-1xl font-bold ${
                          activeTab === 'exam' ? 'text-[#1EAEDB] underline underline-offset-8 decoration-2 decoration-[#1EAEDB]' : ''
                        }`}>Physical Examination
                      </button>
                    </li>
                    <li>
                      <button onClick={() => {setActiveTab('history'); scrollTo(historyRef);}}
                          className={`hover:text-[#1EAEDB] text-1xl font-bold ${
                          activeTab === 'history' ? 'text-[#1EAEDB] underline underline-offset-8 decoration-2 decoration-[#1EAEDB]' : ''
                        }`}>Medical History
                      </button>
                    </li>
                  </ul>
                </nav>
              </CardHeader>

            <CardContent className="flex-1 overflow-y-auto space-y-10 py-6">
                <div ref={personalRef} className="border p-4 rounded">
                  <h2 className="text-xl font-bold mb-4">Personal Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Full Name</Label>
                      <Input required placeholder="Input your full name" value={form.name} onChange={(e) => handleChange('name', e.target.value)} />
                    </div>
                    <div>
                      <Label>Gender</Label>
                      <Input required placeholder="Input your gender" value={form.gender} onChange={(e) => handleChange('gender', e.target.value)} />
                    </div>
                    <div>
                      <Label>Age</Label>
                      <Input required placeholder="Input your age" value={form.age} onChange={(e) => handleChange('age', e.target.value)} />
                    </div>
                    <div>
                      <Label>Address</Label>
                      <Input required placeholder="Input your address" value={form.address} onChange={(e) => handleChange('address', e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="dateOfBirth">Date of Birth</Label>
                      <Input
                        id="dateOfBirth"
                        required
                        placeholder="mm/dd/yyyy"
                        value={form.dateOfBirth}
                        onChange={e => handleChange('dateOfBirth', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Email Address</Label>
                      <Input
                        required
                        type="email"
                        placeholder="Input your email"
                        value={form.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Phone Number</Label>
                      <Input
                        required
                        placeholder="Input your phone number"
                        value={form.phone}
                        onChange={(e) => { if (/^\d*$/.test(e.target.value)) handleChange('phone', e.target.value); }}
                      />
                    </div>
                    <div>
                      <Label>Religion</Label>
                      <Input required placeholder="Input your religion" value={form.religion} onChange={(e) => handleChange('religion', e.target.value)} />
                    </div>
                  </div>
                </div>

                  <div ref={examRef} className="border p-4 rounded">
                    <h2 className="text-xl font-bold mb-4">Physical Examination</h2>
                    <div className="max-w-xs mb-4">
                    <div className="flex items-center gap-4 max-w-xs mb-4">
                    <div className="flex-1">
                      <Label>Select Template</Label>
                      <Select
                        value={selectedTemplate}
                        onValueChange={(val) => {
                          setSelectedTemplate(val);
                          setTemplateData(initialPrescriptionData);
                          setShowForm(false); // Hide form until Add is clicked
                          }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose template" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem
                              value="SOAP Note"
                              className="data-[highlighted]:bg-[#1EAEDB] data-[highlighted]:text-white cursor-pointer">
                              SOAP Note
                            </SelectItem>
                            <SelectItem
                            value="Blank"
                            className="data-[highlighted]:bg-[#1EAEDB] data-[highlighted]:text-white cursor-pointer">
                              Blank
                            </SelectItem>
                            <SelectItem
                              value="E-Prescription"
                              className="data-[highlighted]:bg-[#1EAEDB] data-[highlighted]:text-white cursor-pointer">
                              E-Prescription
                            </SelectItem>
                          </SelectContent>
                      </Select>
                    </div>
                    </div>
                    </div>
                          {selectedTemplate && !showForm && (
                          <Button onClick={() => setShowForm(true)}>Add</Button>)}
                  

                {showForm && selectedTemplate === 'SOAP Note' && (
                  <div className="space-y-4">
                    {['subjective', 'objective', 'assessment', 'plan'].map((field) => {
                      const placeholders: Record<string, string> = {subjective: "Describe the patient's symptoms, complaints, and history in their own words", objective: "Record measurable or observed findings",  assessment: "Summarize your clinical assessment or diagnosis", plan: "Outline the treatment plan, follow-up, or next steps",
                      };
                        return (
                          <div key={field}>
                            <Label>{field.charAt(0).toUpperCase() + field.slice(1)}</Label>
                            <Textarea
                              value={templateData[field] || ''}
                              onChange={(e) => handlePrescriptionChange(field, e.target.value)}
                              placeholder={placeholders[field]}/>
                          </div>
                        );
                    })}
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" className="hover:bg-[#1EAEDB] hover:text-white" onClick={() => setShowCancelDialog(true)}>Cancel</Button>
                          <Button onClick={handleTemplateSave} className="hover:bg-[#1EAEDB]">Save</Button>
                        </div>
                  </div>
                )}

                {showForm && selectedTemplate === 'Blank' && (
                    <div>
                      <Label>Notes</Label>
                      <Textarea value={templateData.notes || ''} onChange={(e) => handlePrescriptionChange('notes', e.target.value)} />
                      <div className="flex justify-end gap-2 mt-2">
                        <Button variant="outline" className="hover:bg-[#1EAEDB] hover:text-white" onClick={() => setSelectedTemplate('')}>Cancel</Button>
                        <Button onClick={handleTemplateSave} className="hover:bg-[#1EAEDB]">Save</Button>
                      </div>
                    </div>
                )}

                {showForm && selectedTemplate === 'E-Prescription' && (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        {['New', 'Favorites', 'Generic', 'Brand'].map((tab) => (
                        <Button key={tab} variant={currentPrescriptionTab === tab ? 'default' : 'outline'} onClick={() => setCurrentPrescriptionTab(tab)}>{tab}</Button>))}
                      </div>

                      {currentPrescriptionTab === 'New' && (
                        <div className="space-y-2">
                          {!templateData.nameType && (
      <div className="text-red-500 text-sm font-semibold mb-1">
        Select if generic or branded
      </div>
    )}
    <div className="flex gap-2">
      <label>
        <input type="radio" name="nameType" checked={templateData.nameType === 'Generic'} onChange={() => handlePrescriptionChange('nameType', 'Generic')} /> Generic Name
      </label>
      <label>
        <input type="radio" name="nameType" checked={templateData.nameType === 'Brand'} onChange={() => handlePrescriptionChange('nameType', 'Brand')} /> Brand Name
      </label>
    </div>
    <Input
      required
      placeholder={prescriptionErrors.name ? "Required" : "Name"}
      className={prescriptionErrors.name ? "border-red-500" : ""}
      value={templateData.name || ''}
      onChange={(e) => handlePrescriptionChange('name', e.target.value)}
    />
    <Input
      required
      placeholder={prescriptionErrors.dose ? "Required" : "Dose"}
      className={prescriptionErrors.dose ? "border-red-500" : ""}
      value={templateData.dose || ''}
      onChange={(e) => handlePrescriptionChange('dose', e.target.value)}
    />
    <Input
      required
      placeholder={prescriptionErrors.quantity ? "Required" : "Quantity"}
      className={prescriptionErrors.quantity ? "border-red-500" : ""}
      value={templateData.quantity || ''}
      onChange={(e) => {
        if (/^\d*$/.test(e.target.value)) handlePrescriptionChange('quantity', e.target.value);
      }}
    />
    <Select
      value={templateData.frequency || ''}
      onValueChange={(val) => handlePrescriptionChange('frequency', val)}
    >
      <SelectTrigger className={prescriptionErrors.frequency ? "border-red-500" : ""}>
        <SelectValue placeholder={prescriptionErrors.frequency ? "Required" : "Select frequency"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="Once daily" className="data-[highlighted]:bg-[#1EAEDB] data-[highlighted]:text-white cursor-pointer">Once daily</SelectItem>
        <SelectItem value="Twice daily" className="data-[highlighted]:bg-[#1EAEDB] data-[highlighted]:text-white cursor-pointer">Twice daily</SelectItem>
        <SelectItem value="Every 8 hours" className="data-[highlighted]:bg-[#1EAEDB] data-[highlighted]:text-white cursor-pointer">Every 8 hours</SelectItem>
        <SelectItem value="custom" className="data-[highlighted]:bg-[#1EAEDB] data-[highlighted]:text-white cursor-pointer">Custom</SelectItem>
      </SelectContent>
    </Select>
    {templateData.frequency === 'custom' && (
      <Input
        className={`mt-2 ${prescriptionErrors.customFrequency ? "border-red-500" : ""}`}
        placeholder={prescriptionErrors.customFrequency ? "Required" : "Enter custom frequency"}
        value={templateData.customFrequency || ''}
        onChange={e => handlePrescriptionChange('customFrequency', e.target.value)}
      />
    )}
    <Input
      type="date"
      className={prescriptionErrors.startDate ? "border-red-500" : ""}
      value={templateData.startDate || ''}
      onChange={(e) => handlePrescriptionChange('startDate', e.target.value)}
      placeholder={prescriptionErrors.startDate ? "Required" : undefined}
    />
    <Input
      type="date"
      className={prescriptionErrors.endDate ? "border-red-500" : ""}
      value={templateData.endDate || ''}
      onChange={(e) => handlePrescriptionChange('endDate', e.target.value)}
      placeholder={prescriptionErrors.endDate ? "Required" : undefined}
    />
    <Textarea
      placeholder={prescriptionErrors.notes ? "Required" : "Doctor's note"}
      className={prescriptionErrors.notes ? "border-red-500" : ""}
      value={templateData.notes || ''}
      onChange={(e) => handlePrescriptionChange('notes', e.target.value)}
    />
    <div className="flex justify-end gap-2 mt-2">
      <Button variant="outline" className="hover:bg-[#1EAEDB] hover:text-white" onClick={() => setSelectedTemplate('')}>Cancel</Button>
      <Button onClick={handleTemplateSave} className="hover:bg-[#1EAEDB]">Save</Button>
    </div>
                        </div>
                      )}

                      {currentPrescriptionTab === 'Favorites' && (
  <div className="space-y-2">
    {favoriteTemplates.length === 0 ? (
      <div className="text-muted-foreground">No favorite templates yet.</div>
    ) : (
      favoriteTemplates.map((item, idx) => (
        <div key={idx} className="border rounded p-2 mb-2">
          <div><strong>Name:</strong> {item.name}</div>
          <div><strong>Dose:</strong> {item.dose}</div>
          <div><strong>Quantity:</strong> {item.quantity}</div>
          <div><strong>Frequency:</strong> {item.frequency}</div>
          <div><strong>Start Date:</strong> {item.startDate}</div>
          <div><strong>End Date:</strong> {item.endDate}</div>
          <div><strong>Notes:</strong> {item.notes}</div>
        </div>
      ))
    )}
  </div>
)}

{currentPrescriptionTab === 'Generic' && (
  <div className="space-y-2">
    {genericTemplates.length === 0 ? (
      <div className="text-muted-foreground">No generic templates yet.</div>
    ) : (
      genericTemplates.map((item, idx) => (
        <div key={idx} className="border rounded p-2 mb-2">
          <div><strong>Name:</strong> {item.name}</div>
          <div><strong>Dose:</strong> {item.dose}</div>
          <div><strong>Quantity:</strong> {item.quantity}</div>
          <div><strong>Frequency:</strong> {item.frequency}</div>
          <div><strong>Start Date:</strong> {item.startDate}</div>
          <div><strong>End Date:</strong> {item.endDate}</div>
          <div><strong>Notes:</strong> {item.notes}</div>
        </div>
      ))
    )}
  </div>
)}

{currentPrescriptionTab === 'Brand' && (
  <div className="space-y-2">
    {brandTemplates.length === 0 ? (
      <div className="text-muted-foreground">No brand templates yet.</div>
    ) : (
      brandTemplates.map((item, idx) => (
        <div key={idx} className="border rounded p-2 mb-2">
          <div><strong>Name:</strong> {item.name}</div>
          <div><strong>Dose:</strong> {item.dose}</div>
          <div><strong>Quantity:</strong> {item.quantity}</div>
          <div><strong>Frequency:</strong> {item.frequency}</div>
          <div><strong>Start Date:</strong> {item.startDate}</div>
          <div><strong>End Date:</strong> {item.endDate}</div>
          <div><strong>Notes:</strong> {item.notes}</div>
        </div>
      ))
    )}
  </div>
)}
                  </div>
                )}

                <Accordion type="single" collapsible>
  {/* SOAP Note Accordion */}
  {templates.some(item => item.type === 'SOAP Note') && templates
    .filter(item => item.type === 'SOAP Note')
    .map((item, idx) => (
      <AccordionItem key={`soap-${idx}`} value={`soap-${idx}`} className="relative">
        <AccordionTrigger>SOAP Note</AccordionTrigger>
        <div className="absolute right-4 top-3 flex gap-2">
          <Pencil className="text-[#FF6B6B] cursor-pointer hover:text-[#1EAEDB]" onClick={() => handleEditTemplate(idx)} />
          <Trash2 className="text-[#FF6B6B] cursor-pointer hover:text-[#1EAEDB]" onClick={() => { setDeleteIndex(idx); setShowDeleteConfirm(true); }} />
        </div>
        <AccordionContent>
          <div>
            <div><strong>Subjective:</strong> {item.data.subjective}</div>
            <div><strong>Objective:</strong> {item.data.objective}</div>
            <div><strong>Assessment:</strong> {item.data.assessment}</div>
            <div><strong>Plan:</strong> {item.data.plan}</div>
          </div>
        </AccordionContent>
      </AccordionItem>
    ))
  }

  {/* E-Prescription Accordion */}
  {templates.some(item => item.type === 'E-Prescription') && (
    <AccordionItem value="e-prescription" className="relative">
      <AccordionTrigger>E-Prescription</AccordionTrigger>
      <AccordionContent>
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead>
              <tr>
                <th className="border px-2 py-1 resize-x overflow-auto min-w-[40px]">#</th>
                <th className="border px-2 py-1 resize-x overflow-auto min-w-[120px]">Generic/Brand</th>
                <th className="border px-2 py-1 resize-x overflow-auto min-w-[120px]">Name</th>
                <th className="border px-2 py-1 resize-x overflow-auto min-w-[80px]">Dose</th>
                <th className="border px-2 py-1 resize-x overflow-auto min-w-[80px]">Quantity</th>
                <th className="border px-2 py-1 resize-x overflow-auto min-w-[120px]">Frequency</th>
                <th className="border px-2 py-1 resize-x overflow-auto min-w-[120px]">Start Date</th>
                <th className="border px-2 py-1 resize-x overflow-auto min-w-[120px]">End Date</th>
                <th className="border px-2 py-1 resize-x overflow-auto min-w-[120px]">Notes</th>
                <th className="border px-2 py-1 min-w-[60px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates
                .filter(item => item.type === 'E-Prescription')
                .map((item, idx) => (
                  <tr key={idx}>
                    <td className="border px-2 py-1">{idx + 1}</td>
                    <td className="border px-2 py-1">{item.data.nameType}</td>
                    <td className="border px-2 py-1">{item.data.name}</td>
                    <td className="border px-2 py-1">{item.data.dose}</td>
                    <td className="border px-2 py-1">{item.data.quantity}</td>
                    <td className="border px-2 py-1">
                      {item.data.frequency === "custom"
                        ? item.data.customFrequency
                        : item.data.frequency}
                    </td>
                    <td className="border px-2 py-1">{item.data.startDate}</td>
                    <td className="border px-2 py-1">{item.data.endDate}</td>
                    <td className="border px-2 py-1">{item.data.notes}</td>
                    <td className="border px-2 py-1 text-center">
                      <button
                        className="p-1 hover:text-[#1EAEDB]"
                        onClick={() => handleEditTemplate(
                          templates.findIndex(t => t === item)
                        )}
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="p-1 hover:text-[#FF6B6B]"
                        onClick={() => {
                          setDeleteIndex(templates.findIndex(t => t === item));
                          setShowDeleteConfirm(true);
                        }}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              {/* Add row for "+" button */}
              <tr
                className="group hover:bg-gray-50 cursor-pointer"
              >
                <td colSpan={10} className="border px-2 py-2 text-center relative">
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-[#1EAEDB] text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto"
                    style={{ fontSize: '1rem', lineHeight: 0.5 }}
                    title="Add E-Prescription"
                    onClick={() => {
                      setSelectedTemplate('E-Prescription');
                      setShowForm(true);
                      setTemplateData({
                        nameType: '',
                        name: '',
                        dose: '',
                        quantity: '',
                        frequency: '',
                        customFrequency: '',
                        startDate: '',
                        endDate: '',
                        notes: '',
                        favorite: false,
                      });
                      setPrescriptionErrors({});
                      setCurrentPrescriptionTab('New');
                    }}
                  >
                    +
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </AccordionContent>
    </AccordionItem>
  )}

  {/* Blank Accordion */}
  {templates.some(item => item.type === 'Blank') && templates
    .filter(item => item.type === 'Blank')
    .map((item, idx) => (
      <AccordionItem key={`blank-${idx}`} value={`blank-${idx}`} className="relative">
        <AccordionTrigger>Blank</AccordionTrigger>
        <div className="absolute right-4 top-3 flex gap-2">
          <Pencil className="text-[#FF6B6B] cursor-pointer hover:text-[#1EAEDB]" onClick={() => handleEditTemplate(idx)} />
          <Trash2 className="text-[#FF6B6B] cursor-pointer hover:text-[#1EAEDB]" onClick={() => { setDeleteIndex(idx); setShowDeleteConfirm(true); }} />
        </div>
        <AccordionContent>
          <div><strong>Notes:</strong> {item.data.notes}</div>
        </AccordionContent>
      </AccordionItem>
    ))
  }
</Accordion>
              </div>

              <div ref={historyRef} className="border p-4 rounded">
                <h2 className="text-xl font-bold mb-4">Medical History</h2>
                {/* Chief Complaint always visible */}
                <div className="mb-4">
                  <Label>Chief Complaint</Label>
                  <Textarea
                    value={medicalHistory.chiefComplaint}
                    onChange={(e) => handleHistoryChange('chiefComplaint', e.target.value)}
                    placeholder={placeholders.chiefComplaint || 'Enter details here...'}
                  />
                </div>
                <div className="flex gap-6 mb-4">
                  {['illnesses', 'surgeries', 'allergies', 'medications', 'familyHistory', 'socialHistory'].map((field) => (
                    <label key={field} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={medicalHistory[field] !== undefined}
                        onChange={e => {
                          if (
                            !e.target.checked &&
                            medicalHistory[field] &&
                            medicalHistory[field].trim() !== ''
                          ) {
                            setPendingUncheckField(field);
                            setShowCancelDialog(true);
                          } else {
                            handleHistoryChange(field, e.target.checked ? '' : undefined);
                          }
                        }}
                      />
                      <span className="capitalize">
                        {field.replace(/([A-Z])/g, ' $1')}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['illnesses', 'surgeries', 'allergies', 'medications', 'familyHistory', 'socialHistory'].map(
                    (field) =>
                      medicalHistory[field] !== undefined && (
                        <div key={field}>
                          <Label>
                            {field.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                          </Label>
                          <Textarea
                            value={medicalHistory[field]}
                            onChange={e => handleHistoryChange(field, e.target.value)}
                            placeholder={placeholders[field] || 'Enter details here...'}
                          />
                        </div>
                      )
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button onClick={handleSaveAll} className="hover:bg-[#1EAEDB]">Save Patient Record</Button>
                <Button variant="outline" className="hover:bg-[#1EAEDB] hover:text-white" onClick={() => setShowCancelModal(true)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>

      {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <DialogContent>
              <DialogHeader>Are you sure you want to delete?</DialogHeader>
              <div className="flex justify-end gap-2">
                <Button onClick={handleDeleteTemplate} className="hover:bg-[#1EAEDB]">Yes</Button>
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>No</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Cancel Dialog */}
          <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you sure you want to cancel?</DialogTitle>
              </DialogHeader>
              <div className="mb-4">
                All the information will be discarded.
              </div>
              <DialogFooter>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (pendingUncheckField) {
                      handleHistoryChange(pendingUncheckField, undefined);
                      setPendingUncheckField(null);
                    }
                    setShowCancelDialog(false);
                  }}
                >
                  Yes
                </Button>
                <Button
                  variant="outline"
                  className="hover:bg-[#1EAEDB] hover:text-white"
                  onClick={() => {
                    setPendingUncheckField(null);
                    setShowCancelDialog(false);
                  }}
                >
                  No
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        {/* Cancel Modal */}
        {showCancelModal && (
          <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
            <DialogContent>
              <div className="flex justify-between items-center">
                <DialogHeader>Confirm Cancellation</DialogHeader>
                <button onClick={() => setShowCancelModal(false)}></button>
              </div>
              <p>Are you sure you want to cancel? All the information will be discarded.</p>
              <div className="flex justify-end gap-2 mt-4">
                <Button onClick={() => navigate('/patients')} className="hover:bg-[#1EAEDB] hover:text-white">Yes</Button>
                <Button variant="outline" className="hover:bg-[#1EAEDB] hover:text-white" onClick={() => setShowCancelModal(false)}>No</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
    </div>
  );
}


export default AddPatient;