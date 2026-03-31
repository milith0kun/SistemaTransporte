import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../services/api';
import { UserRole } from '../../types';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert } from '../../components/ui/alert';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_REDIRECT } from '../../lib/constants';

const schema = z.object({
  name: z.string().min(3, 'Mínimo 3 caracteres'),
  email: z.string().email('Correo inválido'),
  dni: z.string().regex(/^\d{8}$/, 'DNI debe tener 8 dígitos'),
  phone: z.string().regex(/^\+?[0-9]{9,15}$/, 'Teléfono inválido').optional().or(z.literal('')),
  municipality_id: z.string().uuid('Seleccione una municipalidad'),
  password: z
    .string()
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
      'Mínimo 8 caracteres, una mayúscula, una minúscula y un número',
    ),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

interface Municipality {
  id: string;
  name: string;
}

export function RegisterPage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(ROLE_REDIRECT[user.role], { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    api.get<Municipality[]>('/api/municipalities')
      .then((data) => setMunicipalities(data))
      .catch(() => console.error('Error loading municipalities'));
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      setError('');
      const { confirmPassword, ...payload } = data;
      await api.post('/api/auth/register', { ...payload, role: UserRole.CIUDADANO });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(' · ') : (msg ?? 'Error al registrarse.'));
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-gradient-to-br from-blue-50 via-slate-50 to-blue-100 px-4 sm:px-6 lg:px-8 py-12">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Title & Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tighter flex items-center justify-center gap-1">
            SFIT<span className="text-blue-600">.</span>
          </h1>
          <p className="mt-2 text-sm text-slate-500 font-medium tracking-wide uppercase">
            Registro de Ciudadano
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow-xl shadow-blue-900/5 border border-slate-100 sm:rounded-2xl sm:px-10 backdrop-blur-sm bg-white/95">
          {success ? (
            <Alert variant="success" title="¡Registro exitoso!">
              Su cuenta ha sido creada. Redirigiendo al login…
            </Alert>
          ) : (
            <>
              {error && <Alert variant="error" className="mb-6">{error}</Alert>}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <Label htmlFor="name" className="text-slate-700 font-medium">Nombre completo</Label>
                  <Input id="name" placeholder="Juan Mamani Quispe" {...register('name')} error={errors.name?.message} className="mt-1.5" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dni" className="text-slate-700 font-medium">DNI</Label>
                    <Input id="dni" placeholder="12345678" maxLength={8} {...register('dni')} error={errors.dni?.message} className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-slate-700 font-medium">Teléfono</Label>
                    <Input id="phone" placeholder="+51 999 888 777" {...register('phone')} error={errors.phone?.message} className="mt-1.5" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email" className="text-slate-700 font-medium">Correo electrónico</Label>
                  <Input id="email" type="email" placeholder="correo@ejemplo.com" {...register('email')} error={errors.email?.message} className="mt-1.5" />
                </div>

                <div>
                  <Label htmlFor="municipality_id" className="text-slate-700 font-medium">Municipalidad</Label>
                  <select
                    id="municipality_id"
                    {...register('municipality_id')}
                    className="mt-1.5 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                  >
                    <option value="">Seleccione…</option>
                    {municipalities.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  {errors.municipality_id && (
                    <p className="mt-1 text-xs text-red-500 font-medium">{errors.municipality_id.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="password" className="text-slate-700 font-medium">Contraseña</Label>
                  <Input id="password" type="password" placeholder="Mínimo 8 caracteres" {...register('password')} error={errors.password?.message} className="mt-1.5" />
                </div>

                <div>
                  <Label htmlFor="confirmPassword" className="text-slate-700 font-medium">Confirmar contraseña</Label>
                  <Input id="confirmPassword" type="password" placeholder="Repita la contraseña" {...register('confirmPassword')} error={errors.confirmPassword?.message} className="mt-1.5" />
                </div>

                <Button type="submit" className="w-full mt-4" loading={isSubmitting}>
                  Crear cuenta
                </Button>
              </form>
            </>
          )}

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
