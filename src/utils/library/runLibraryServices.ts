import { AppDispatch, RootState } from '@/utils/redux/store';
import { setServiceStatus } from '@/utils/redux/slices/libraryStatusSlice';

type ServiceContext = {
    serverType: string;
    serverUrl: string;
    username: string;
    password: string;
    dispatch: AppDispatch;
    getState: () => RootState;
};

export type LibraryService = (context: ServiceContext) => Promise<{
    key: string;
    status: 'success' | 'error';
    meta?: Record<string, any>;
    error?: string | null;
    data?: any; // ✅ Add this line
}>;

export const runLibraryServices = async (
    services: LibraryService[],
    context: ServiceContext
): Promise<Record<string, any>> => {
    const resultMap: Record<string, any> = {};

    await Promise.all(
        services.map(async (service) => {
            const statusKey = (service as any).serviceKey || service.name || 'unknown';
            try {
                const result = await service(context);
                const { key, status, error, meta, data } = result;

                context.dispatch(setServiceStatus({ key, status, error, meta }));

                if (data) {
                    resultMap[key] = data;
                }
            } catch (err: any) {
                console.error(`[LibraryService] ${statusKey} failed →`, {
                    message: err?.message || 'Unknown error',
                    stack: err?.stack,
                    error: JSON.stringify(err, Object.getOwnPropertyNames(err)),
                });

                context.dispatch(
                    setServiceStatus({
                        key: statusKey,
                        status: 'error',
                        error: err?.message || 'Unknown error',
                    })
                );
            }
        })

);

    return resultMap;
};