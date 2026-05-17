"use client";

import { UseFormWatch } from "react-hook-form";
import { FormLanguage, t } from "@/lib/translations";

interface FormSummaryViewProps {
    watch: UseFormWatch<any>;
    lang: FormLanguage;
}

export function FormSummaryView({ watch, lang }: FormSummaryViewProps) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 shrink-0">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    {lang === "he" ? "סיכום המידע" : "Review Your Information"}
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                    {lang === "he" 
                        ? "אנא בדוק את כל הפרטים לפני השליחה. לאחר האישור, הטופס יישלח לבדיקה."
                        : "Please review all your information before submitting. After confirmation, the form will be sent for review."}
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-lg border-b pb-2">{t(lang, "steps.basicInfo")}</h4>
                    <div className="space-y-2 text-sm">
                        <div><span className="font-medium">{t(lang, "labels.fullName")}:</span> {watch("fullName") || "—"}</div>
                        <div><span className="font-medium">{t(lang, "labels.email")}:</span> {watch("email") || "—"}</div>
                        <div><span className="font-medium">{t(lang, "labels.phone")}:</span> {watch("phone") || "—"}</div>
                        <div><span className="font-medium">{t(lang, "labels.dob")}:</span> <span className="text-xs">{watch("dob") || "—"}</span></div>
                        <div><span className="font-medium">{t(lang, "labels.gender")}:</span> {watch("gender") || "—"}</div>
                        <div><span className="font-medium">{t(lang, "labels.location")}:</span> {watch("location") || "—"}</div>
                    </div>
                </div>

                {/* Appearance */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-lg border-b pb-2">{t(lang, "steps.appearance")}</h4>
                    <div className="space-y-2 text-sm">
                        <div><span className="font-medium">{t(lang, "labels.height")}:</span> {watch("height") ? `${watch("height")} cm` : "—"}</div>
                        <div><span className="font-medium">{t(lang, "labels.eyeColor")}:</span> {watch("eyeColor") || "—"}</div>
                        <div><span className="font-medium">{t(lang, "labels.hairColor")}:</span> {watch("hairColor") || "—"}</div>
                        {watch("photoUrl") && (
                            <div className="mt-2">
                                <img src={watch("photoUrl")} alt="Profile" className="w-24 h-24 rounded-full object-cover shadow-sm" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Background */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-lg border-b pb-2">{t(lang, "steps.background")}</h4>
                    <div className="space-y-2 text-sm">
                        <div><span className="font-medium">{t(lang, "labels.ethnicity")}:</span> {watch("ethnicity") || "—"}</div>
                        <div><span className="font-medium">{t(lang, "labels.maritalStatus")}:</span> {watch("maritalStatus") || "—"}</div>
                        <div><span className="font-medium">{t(lang, "labels.languages")}:</span> {(() => { const langs = watch("languages"); return Array.isArray(langs) ? langs.join(", ") || "—" : langs || "—"; })()}</div>
                        <div><span className="font-medium">{t(lang, "labels.education")}:</span> {watch("education") || "—"}</div>
                        <div><span className="font-medium">{t(lang, "labels.occupationTitle")}:</span> {watch("occupationTitle") || "—"}</div>
                        {watch("occupationDescription") && (
                            <div><span className="font-medium">{t(lang, "labels.occupationDescription")}:</span> {watch("occupationDescription")}</div>
                        )}
                    </div>
                </div>

                {/* Religious Details */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-lg border-b pb-2">{t(lang, "steps.religiousDetails")}</h4>
                    <div className="space-y-2 text-sm">
                        <div><span className="font-medium">{t(lang, "labels.religiousAffiliation")}:</span> {(() => { const aff = watch("religiousAffiliation"); return Array.isArray(aff) ? aff.join(", ") || "—" : aff || "—"; })()}</div>
                        {watch("gender") === "Male" && <div><span className="font-medium">{t(lang, "labels.learningStatus")}:</span> {watch("learningStatus") || "—"}</div>}
                        {watch("gender") === "Female" && <div><span className="font-medium">{t(lang, "labels.headCovering")}:</span> {watch("headCovering") || "—"}</div>}
                        <div><span className="font-medium">{t(lang, "labels.religiousDetailsFreeText")}:</span> {watch("religiousDetailsFreeText") || "—"}</div>
                    </div>
                </div>

                {/* Personal */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-lg border-b pb-2">{t(lang, "steps.personal")}</h4>
                    <div className="space-y-2 text-sm">
                        <div><span className="font-medium">{t(lang, "labels.hobbies")}:</span> {watch("hobbies") || "—"}</div>
                        <div><span className="font-medium">{t(lang, "labels.personality")}:</span> {watch("personality") || "—"}</div>
                        <div><span className="font-medium">{t(lang, "labels.smoking")}:</span> {watch("smoking") || "—"}</div>
                        <div><span className="font-medium">{t(lang, "labels.medicalHistory")}:</span> {watch("medicalHistory") ? (lang === "he" ? "כן" : "Yes") : (lang === "he" ? "לא" : "No")}</div>
                    </div>
                </div>

                {/* Preferences */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-lg border-b pb-2">{t(lang, "steps.preferences")}</h4>
                    <div className="space-y-2 text-sm">
                        <div><span className="font-medium">{t(lang, "labels.ageGapPreference")}:</span> {(() => { const gap = watch("ageGapPreference"); return Array.isArray(gap) ? gap.join(", ") || "—" : gap || "—"; })()}</div>
                        <div><span className="font-medium">{t(lang, "labels.preferredEthnicities")}:</span> {(() => { const ethnicities = watch("preferredEthnicities"); return Array.isArray(ethnicities) ? ethnicities.join(", ") || "—" : ethnicities || "—"; })()}</div>
                        {watch("preferencesFreeText") && (
                            <div><span className="font-medium">{t(lang, "labels.preferencesFreeText")}:</span> {watch("preferencesFreeText") || "—"}</div>
                        )}
                    </div>
                </div>

                {/* References - For external forms */}
                {watch("references") && (
                    <div className="space-y-4">
                        <h4 className="font-semibold text-lg border-b pb-2">{t(lang, "labels.references")}</h4>
                        <div className="text-sm whitespace-pre-wrap">{watch("references") || "—"}</div>
                    </div>
                )}
            </div>
        </div>
    );
}
