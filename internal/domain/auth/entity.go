package domainauth

import "time"

func (Blacklist) TableName() string {
	return "blacklist"
}

type Blacklist struct {
	ID        string    `gorm:"column:id;type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Token     string    `gorm:"column:token;type:text;not null;uniqueIndex:idx_blacklist_token" json:"token"`
	CreatedAt time.Time `gorm:"column:created_at;autoCreateTime" json:"created_at"`
}
