
    private string GetAllowedDomainForRole(UserRole role)
    {
        return role switch
        {
            UserRole.Manager => "branch",  // Branch Manager only on branch domain
            UserRole.SuperAdmin => "admin", // SuperAdmin only on admin domain
            UserRole.Admin => "admin",      // Admin only on admin domain
            UserRole.SupportTechnique => "admin", // Support only on admin domain
            UserRole.Cashier => "branch",   // Cashier on branch domain
            UserRole.Employee => "branch",  // Employee on branch domain
            _ => "branch"
        };
    }
}
