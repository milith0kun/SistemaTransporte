import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
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
    <div className="min-h-screen flex flex-col justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Title & Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tighter flex items-center justify-center gap-1">
            SFIT<span className="text-blue-600">.</span>
          </h1>
          <p className="mt-2 text-sm text-slate-500 font-medium tracking-wide uppercase">
            Sistema de Fiscalización Inteligente
          </p>
        </div>

        {/* Card */}
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 sm:rounded-2xl sm:px-10">
          <h2 className="text-xl font-semibold text-slate-900 mb-6 text-center">Acceder a tu cuenta</h2>

          {error && (
            <Alert variant="error" className="mb-6">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-slate-700 font-medium">Correo electrónico</Label>
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
              <Label htmlFor="password" className="text-slate-700 font-medium">Contraseña</Label>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full mt-2" loading={isSubmitting}>
              Ingresar
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              ¿Eres un ciudadano?{' '}
              <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-slate-400 font-medium">
          &copy; 2026 SFIT · Apurímac, Perú
        </p>
      </div>
    </div>
  );
}
