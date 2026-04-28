package interfacedealer

import (
	domaindealer "service-songket/internal/domain/dealer"
	interfacegeneric "service-songket/internal/interfaces/generic"
)

type RepoDealerInterface interface {
	interfacegeneric.GenericRepository[domaindealer.Dealer]
}
