package models 

import "time"

type User struct {
	ID   uint `json:"id"`
	Name string `json:"name"`
	Email string `json:"email"`
	Password string `json:"-"`
	CreatedAt time.Time `json:"password"` 
}

type RegisterInput struct {
	Name string `json:"name"`
	Email string `json:"email"`
	Password string `json:"password"`
}

type LoginInput struct {
	Email string `json:"email"`
	Password string `json:"password"`
}