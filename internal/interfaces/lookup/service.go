package interfacelookup

type ServiceLookupInterface interface {
	GetAll() (map[string]interface{}, error)
}
