"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Heart } from "lucide-react";
import { getBrand } from "@/config/branding";
import { validateInviteToken, registerUser } from "@/actions/admin";

type FormState = {
    username: string;
    fullName: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
};

export default function SignupPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("invite") || "";
    const brand = getBrand();

    const [tokenValid, setTokenValid] = useState<boolean | null>(null);
    const [form, setForm] = useState<FormState>({
        username: "",
        fullName: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!token) {
            setTokenValid(false);
            return;
        }
        validateInviteToken(token).then(setTokenValid);
    }, [token]);

    const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({ ...prev, [field]: e.target.value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (form.password !== form.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (form.password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }

        setLoading(true);
        try {
            const user = await registerUser(token, {
                username: form.username,
                fullName: form.fullName,
                email: form.email || undefined,
                phone: form.phone || undefined,
                password: form.password,
            });

            localStorage.setItem("mock_user", JSON.stringify(user));
            router.push("/");
        } catch (err: any) {
            setError(err?.message || "Registration failed.");
        } finally {
            setLoading(false);
        }
    };

    if (tokenValid === null) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <p className="text-sm text-muted-foreground">Validating invite link…</p>
            </div>
        );
    }

    if (!tokenValid) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
                <div className="w-full max-w-md text-center space-y-4 bg-white dark:bg-gray-950 p-8 rounded-xl shadow-lg">
                    <Heart className="w-12 h-12 text-red-300 mx-auto" />
                    <h2 className="text-xl font-bold">Invalid invite link</h2>
                    <p className="text-sm text-muted-foreground">
                        This invite link is invalid, has already been used, or has expired.
                        Please contact your administrator for a new link.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 z-50 overflow-y-auto">
            <div className="w-full max-w-md space-y-6 bg-white dark:bg-gray-950 p-8 rounded-xl shadow-lg my-8">
                <div className="flex flex-col items-center text-center">
                    <Heart className="w-10 h-10 text-red-500 fill-red-500 mb-3" />
                    <h2 className="text-2xl font-bold tracking-tight">Create your account</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        You've been invited to join {brand.shortName}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md text-center">
                            {error}
                        </div>
                    )}

                    <Field label="Username *" htmlFor="username">
                        <input
                            id="username"
                            type="text"
                            required
                            className={inputClass}
                            placeholder="sara"
                            value={form.username}
                            onChange={set("username")}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            3–30 characters, letters/numbers/underscores only. Cannot be changed later.
                        </p>
                    </Field>

                    <Field label="Full name *" htmlFor="fullName">
                        <input
                            id="fullName"
                            type="text"
                            required
                            className={inputClass}
                            placeholder="Sara Cohen"
                            value={form.fullName}
                            onChange={set("fullName")}
                        />
                    </Field>

                    <Field label="Email" htmlFor="email">
                        <input
                            id="email"
                            type="email"
                            className={inputClass}
                            placeholder="sara@example.com"
                            value={form.email}
                            onChange={set("email")}
                        />
                    </Field>

                    <Field label="Phone" htmlFor="phone">
                        <input
                            id="phone"
                            type="tel"
                            className={inputClass}
                            placeholder="+972 50 000 0000"
                            value={form.phone}
                            onChange={set("phone")}
                        />
                    </Field>

                    <Field label="Password *" htmlFor="password">
                        <input
                            id="password"
                            type="password"
                            required
                            className={inputClass}
                            placeholder="••••••••"
                            value={form.password}
                            onChange={set("password")}
                        />
                    </Field>

                    <Field label="Confirm password *" htmlFor="confirmPassword">
                        <input
                            id="confirmPassword"
                            type="password"
                            required
                            className={inputClass}
                            placeholder="••••••••"
                            value={form.confirmPassword}
                            onChange={set("confirmPassword")}
                        />
                    </Field>

                    <button
                        type="submit"
                        disabled={loading}
                        className="flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? "Creating account…" : "Create account"}
                    </button>
                </form>
            </div>
        </div>
    );
}

const inputClass =
    "block w-full rounded-lg px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-sm placeholder:text-sm dark:bg-gray-900 border border-gray-200 dark:border-gray-800";

function Field({
    label,
    htmlFor,
    children,
}: {
    label: string;
    htmlFor: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {label}
            </label>
            {children}
        </div>
    );
}
