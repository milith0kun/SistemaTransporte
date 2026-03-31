import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Bus, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert } from '../../components/ui/alert';
import { ROLE_REDIRECT } from '../../lib/constants';

const schema = z.object({
  email: z.string().email('Ingrese un correo válido'),
  password: z.string().min(1, 'Ingrese su contraseña'),
});

type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(ROLE_REDIRECT[user.role], { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      setError('');
      await login(data.email, data.password);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Credenciales inválidas. Intente nuevamente.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Title & Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 shadow-sm mb-4">
            <Bus className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">SFIT</h1>
          <p className="mt-1 text-sm text-gray-500 font-medium">Sistema de Fiscalización Inteligente</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-8 py-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Iniciar sesión</h2>

            {error && (
              <Alert variant="error" className="mb-6">
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <Label htmlFor="email" className="text-gray-700">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="usuario@municipio.gob.pe"
                  {...register('email')}
                  error={errors.email?.message}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-gray-700">Contraseña</Label>
                <div className="relative mt-1.5">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    {...register('password')}
                    error={errors.password?.message}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full mt-2" loading={isSubmitting}>
                Ingresar
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-500">
                ¿Ciudadano?{' '}
                <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                  Regístrese aquí
                </Link>
              </p>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-gray-400 font-medium">
          SFIT © 2026 · Apurímac, Perú
        </p>
      </div>
    </div>
  );
}
