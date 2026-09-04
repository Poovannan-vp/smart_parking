/**
 * Parking Layouts Management Page
 * Admin interface for managing a location's Layouts and editing each
 * Layout's physical parking geometry.
 *
 * A location's very first uploaded layout is saved directly as its real
 * "Default Parking" layout - no separate "create a layout" step. Once a
 * location has a layout, "Add Layout" lets the Admin name and upload an
 * additional, independent one.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PageContainer from "../../../shared/components/PageContainer";
import PageHeader from "../../../shared/components/PageHeader";
import Button from "../../../shared/components/Button";
import Card from "../../../shared/components/Card";
import Alert from "../../../shared/components/Alert";
import LoadingState from "../../../shared/components/LoadingState";
import useAuth from "../../auth/hooks/useAuth";
import { EnhancedParkingLayoutEditor } from "../components/EnhancedParkingLayoutEditor";
import { BangaloreLayoutImporter } from "../components/BangaloreLayoutImporter";
import { getLayout, saveLayoutSlots, createDefaultLayout, createNamedLayout } from "../../../services/layoutService";
import { getBuildings, type BuildingOption } from "../../../services/buildingService";
import BuildingSelector from "../../home/components/BuildingSelector";
import { useLocationLayouts, LayoutSelector, PhysicalLayoutView, useSlotStatuses } from "../../parking";
import { ROUTES } from "../../../app/routes";
import type { ParkingSlot, ParkingLayoutConfig } from "../../../types/parkingLayout";

export default function ParkingLayoutsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState("");

  // An existing, already-saved layout being viewed/edited (id into `layouts`).
  const [selectedLayoutId, setSelectedLayoutId] = useState("");
  // A not-yet-saved layout being composed: either this location's very
  // first (implicit "Default Parking") or a named one from "Add Layout".
  // Nothing is written to Firestore until this is actually saved.
  const [draft, setDraft] = useState<{ name: string; isDefault: boolean } | null>(null);

  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [blueprintImage, setBlueprintImage] = useState<string | undefined>();
  const [loadingLayout, setLoadingLayout] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"editor" | "import" | "status">("editor");
  const [importedLayout, setImportedLayout] = useState<ParkingLayoutConfig | null>(null);

  const { layouts, loading: loadingLayouts } = useLocationLayouts(selectedBuildingId || undefined);
  // Status only applies to an existing, already-saved layout - not to a
  // not-yet-persisted draft, which has no layoutId to key status against.
  const { getStatus } = useSlotStatuses(selectedBuildingId || undefined, !draft ? selectedLayoutId || undefined : undefined);

  // Set right before selecting a layout we just created ourselves, so the
  // geometry-load effect doesn't redundantly re-fetch what's already in
  // local state (and briefly flash a loading screen right after Save).
  const justSavedLayoutIdRef = useRef<string | null>(null);

  // Load the list of locations (buildings) once. Admin accounts are not
  // building-assigned, so there is no correct implicit default - the Admin
  // must explicitly pick one before any layout is loaded or displayed.
  useEffect(() => {
    void getBuildings()
      .then(setBuildings)
      .catch(() => setError("Unable to load locations."));
  }, []);

  // Reset everything when switching locations
  useEffect(() => {
    setSelectedLayoutId("");
    setDraft(null);
    setSlots([]);
    setBlueprintImage(undefined);
    setImportedLayout(null);
    setError(null);
    setSuccess(false);
  }, [selectedBuildingId]);

  // Once this location's layouts are known: if it has none, start composing
  // its first (implicit default) layout directly - no selection required.
  // If it already has layouts and nothing is selected/being composed yet,
  // default to viewing its default layout.
  useEffect(() => {
    if (loadingLayouts || !selectedBuildingId) return;
    if (draft || selectedLayoutId) return;

    if (layouts.length === 0) {
      setDraft({ name: "Default Parking", isDefault: true });
      setActiveTab("import");
    } else {
      setSelectedLayoutId(layouts[0].id);
    }
  }, [loadingLayouts, selectedBuildingId, layouts, draft, selectedLayoutId]);

  // Load an existing selected layout's saved geometry once (not a live
  // subscription - edits stay local until Save, so an incoming realtime
  // update must never overwrite what the Admin is currently editing).
  useEffect(() => {
    if (!selectedBuildingId || !selectedLayoutId || draft) return;

    if (justSavedLayoutIdRef.current === selectedLayoutId) {
      justSavedLayoutIdRef.current = null;
      return;
    }

    setLoadingLayout(true);
    setError(null);
    setSuccess(false);

    void getLayout(selectedBuildingId, selectedLayoutId)
      .then((layout) => {
        setSlots(layout?.slots ?? []);
        setBlueprintImage(layout?.blueprintImage);
      })
      .catch((loadError) => {
        console.error("Error loading layout:", loadError);
        setError("Failed to load this layout.");
        setSlots([]);
        setBlueprintImage(undefined);
      })
      .finally(() => setLoadingLayout(false));
  }, [selectedBuildingId, selectedLayoutId, draft]);

  // Admin picked an existing layout from the selector
  const handleSelectLayout = useCallback((layoutId: string) => {
    setDraft(null);
    setSelectedLayoutId(layoutId);
    setActiveTab("editor");
    setImportedLayout(null);
    setError(null);
    setSuccess(false);
  }, []);

  // Admin chose "Add Layout" and named it - starts a fresh local draft,
  // nothing is persisted until Save.
  const handleStartAddLayout = useCallback((name: string) => {
    setSelectedLayoutId("");
    setDraft({ name, isDefault: false });
    setSlots([]);
    setBlueprintImage(undefined);
    setImportedLayout(null);
    setActiveTab("import");
    setError(null);
    setSuccess(false);
  }, []);

  // Handle blueprint upload
  const handleBlueprintUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setBlueprintImage(dataUrl);
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle import success
  const handleImportSuccess = useCallback((layout: ParkingLayoutConfig) => {
    setImportedLayout(layout);
    // Extract all slots from the layout structure
    const allSlots: ParkingSlot[] = [];
    layout.areas?.forEach(area => {
      area.levels?.forEach(level => {
        allSlots.push(...level.slots);
      });
    });
    setSlots(allSlots);
    setActiveTab("editor");
    setError(null);
  }, []);

  // Save layout
  const handleSave = async () => {
    if (!selectedBuildingId) return;
    if (slots.length === 0) {
      setError("Please add at least one parking slot");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const updatedBy = user?.uid ?? "admin";

      if (draft) {
        const newLayoutId = draft.isDefault
          ? await createDefaultLayout(selectedBuildingId, slots, updatedBy, blueprintImage)
          : await createNamedLayout(selectedBuildingId, draft.name, slots, updatedBy, blueprintImage);

        setDraft(null);
        justSavedLayoutIdRef.current = newLayoutId;
        setSelectedLayoutId(newLayoutId);
      } else if (selectedLayoutId) {
        await saveLayoutSlots(selectedBuildingId, selectedLayoutId, slots, updatedBy, blueprintImage);
      } else {
        return;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving layout:", err);
      setError("Failed to save parking layout");
    } finally {
      setSaving(false);
    }
  };

  // Export layout as JSON
  const handleExport = () => {
    const layoutName = draft?.name ?? layouts.find((layout) => layout.id === selectedLayoutId)?.name ?? "Layout";
    const data = {
      locationId: selectedBuildingId,
      layoutName,
      slots,
      blueprintImage: blueprintImage ? "reference" : "none",
      exportedAt: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", `${layoutName}.json`);
    linkElement.click();
  };

  const selectedBuilding = buildings.find((building) => building.id === selectedBuildingId);
  const selectedLayout = layouts.find((layout) => layout.id === selectedLayoutId);
  const activeLayoutName = draft?.name ?? selectedLayout?.name ?? "";
  const isComposingFirstLayout = Boolean(draft?.isDefault) && layouts.length === 0;
  const canEdit = Boolean(selectedBuildingId) && !loadingLayouts && Boolean(draft || selectedLayoutId) && !loadingLayout;

  return (
    <PageContainer>
      <div className="mx-auto max-w-7xl space-y-8 py-8">
        <PageHeader
          title="Parking Layout Management"
          subtitle="Upload and manage each location's physical parking layouts"
          actions={
            <Button variant="secondary" onClick={() => navigate(ROUTES.ADMIN)}>
              Back to Admin
            </Button>
          }
        />

        {/* Error Message */}
        {error && <Alert variant="error">{error}</Alert>}

        {/* Success Message */}
        {success && <Alert variant="success">Parking layout saved successfully.</Alert>}

        {/* Workflow step indicator */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          <span className={selectedBuildingId ? "text-temenos-teal" : "text-slate-900"}>1. Location</span>
          <span aria-hidden="true">→</span>
          <span className={!selectedBuildingId ? "text-slate-300" : draft || selectedLayoutId ? "text-temenos-teal" : "text-slate-900"}>2. Layout</span>
          <span aria-hidden="true">→</span>
          <span className={canEdit ? "text-slate-900" : "text-slate-300"}>3. Import / Edit</span>
          <span aria-hidden="true">→</span>
          <span className="text-slate-300">4. Save</span>
        </div>

        {/* Location selection */}
        <Card className="space-y-5">
          <div>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Location</h2>
            <BuildingSelector
              buildings={buildings}
              selectedBuilding={selectedBuildingId}
              onChange={setSelectedBuildingId}
            />
          </div>

          {!selectedBuildingId && (
            <p className="text-sm text-slate-600">Select a location above to view and manage its parking layout.</p>
          )}

          {selectedBuildingId && !loadingLayouts && (
            <div>
              {layouts.length > 0 ? (
                <>
                  <h2 className="mb-3 text-lg font-semibold text-slate-900">Layout</h2>
                  <LayoutSelector
                    layouts={layouts}
                    selectedLayoutId={draft ? "" : selectedLayoutId}
                    onChange={handleSelectLayout}
                    onCreate={handleStartAddLayout}
                  />
                </>
              ) : null}

              {isComposingFirstLayout && (
                <p className="text-sm text-slate-600">
                  This location doesn't have a parking layout yet. Upload a file below - it will be saved as this
                  location's <span className="font-medium text-slate-800">Default Parking</span> layout.
                </p>
              )}

              {draft && !draft.isDefault && (
                <div className="mt-2 flex items-center gap-3 rounded-2xl bg-temenos-teal-light border border-temenos-teal/30 px-4 py-3">
                  <p className="text-sm text-temenos-navy">
                    Creating new layout: <span className="font-semibold">{draft.name}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setDraft(null)}
                    className="ml-auto text-xs font-medium text-temenos-teal-dark hover:text-temenos-navy transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {!draft && selectedBuilding && selectedLayout && (
                <p className="mt-2 text-xs text-slate-500">
                  Editing <span className="font-medium text-slate-700">{selectedLayout.name}</span> for{" "}
                  <span className="font-medium text-slate-700">{selectedBuilding.name}</span>
                </p>
              )}
            </div>
          )}
        </Card>

        {canEdit && (
          <>
            {/* Tabs */}
            <Card className="p-0 overflow-hidden">
              <div className="flex border-b border-slate-200">
                <button
                  onClick={() => setActiveTab("import")}
                  className={`flex-1 px-6 py-3 text-center font-semibold transition-colors duration-150 ${
                    activeTab === "import"
                      ? "border-b-2 border-temenos-teal text-temenos-navy"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Import from Excel
                </button>
                <button
                  onClick={() => setActiveTab("editor")}
                  className={`flex-1 px-6 py-3 text-center font-semibold transition-colors duration-150 ${
                    activeTab === "editor"
                      ? "border-b-2 border-temenos-teal text-temenos-navy"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Layout Editor
                </button>
                {!draft && (
                  <button
                    onClick={() => setActiveTab("status")}
                    className={`flex-1 px-6 py-3 text-center font-semibold transition-colors duration-150 ${
                      activeTab === "status"
                        ? "border-b-2 border-temenos-teal text-temenos-navy"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Slot Status
                  </button>
                )}
              </div>

              <div className="p-6">
                {/* Import Tab */}
                {activeTab === "import" && (
                  <div>
                    <h3 className="mb-4 text-lg font-semibold text-slate-900">Import Layout from Excel</h3>
                    <p className="mb-6 text-sm text-slate-600">
                      Upload an Excel file to automatically extract parking slots, passages, and structural elements.
                      The importer preserves the exact layout geometry from the file.
                    </p>
                    <BangaloreLayoutImporter
                      onImportSuccess={handleImportSuccess}
                      loading={loadingLayout}
                    />
                  </div>
                )}

                {/* Editor Tab */}
                {activeTab === "editor" && (
                  <div className="space-y-6">
                    {/* Blueprint Management */}
                    <div>
                      <h3 className="mb-4 text-lg font-semibold text-slate-900">Blueprint Reference</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Upload Blueprint Image</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleBlueprintUpload}
                            className="block w-full text-sm text-slate-500 file:mr-4 file:px-4 file:py-2 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-temenos-teal-light file:text-temenos-teal-dark hover:file:bg-temenos-teal/20 file:transition-colors"
                          />
                          <p className="mt-2 text-xs text-slate-600">
                            Upload a high-quality blueprint image (PNG, JPG) for visual reference while placing slots
                          </p>
                        </div>

                        {blueprintImage && (
                          <div className="mt-4">
                            <p className="text-sm font-medium text-slate-700 mb-2">Current Blueprint Preview</p>
                            <img
                              src={blueprintImage}
                              alt="Blueprint"
                              className="max-h-64 rounded border border-slate-300"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Import Info Banner */}
                    {importedLayout && (
                      <Alert variant="success">
                        <strong>Layout imported from Excel.</strong> You can now review and save the layout.
                      </Alert>
                    )}

                    {/* Enhanced Editor */}
                    <div>
                      <h3 className="mb-4 text-lg font-semibold text-slate-900">Layout Editor</h3>
                      <p className="mb-6 text-sm text-slate-600">
                        Use the editor below to position parking slots precisely. The blueprint is shown at 20% opacity as a
                        reference.
                      </p>

                      {loadingLayout ? (
                        <LoadingState message="Loading layout..." />
                      ) : (
                        <EnhancedParkingLayoutEditor
                          slots={slots}
                          locationName={activeLayoutName}
                          blueprintImage={blueprintImage}
                          onSlotsChange={setSlots}
                          loading={saving}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Slot Status Tab (read-only) */}
                {activeTab === "status" && !draft && (
                  <div>
                    <h3 className="mb-4 text-lg font-semibold text-slate-900">Current Slot Status</h3>
                    <p className="mb-6 text-sm text-slate-600">
                      Read-only view of this layout's saved parking-slot statuses. Statuses are updated by Security.
                    </p>
                    <PhysicalLayoutView slots={slots} getSlotStatus={getStatus} />
                  </div>
                )}
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button onClick={handleSave} disabled={saving || loadingLayout || slots.length === 0} className="flex-1">
                {saving ? "Saving..." : "Save Layout"}
              </Button>
              <Button
                variant="secondary"
                onClick={handleExport}
                disabled={loadingLayout || slots.length === 0}
                className="flex-1"
              >
                Export as JSON
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate(ROUTES.ADMIN)}
                disabled={saving}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
}
