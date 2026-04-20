import api from './api'

export const fetchProvinces = () => api.get('/api/location/province')
export const fetchKabupaten = (pro: string) =>
  api.get('/api/location/city', { params: { pro } })
export const fetchKecamatan = (pro: string, kab: string) =>
  api.get('/api/location/district', { params: { pro, kab } })

const locationService = {
  fetchProvinces,
  fetchKabupaten,
  fetchKecamatan,
}

export default locationService
