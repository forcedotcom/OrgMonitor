/*
  Copyright (c) 2017, salesforce.com, inc.
  All rights reserved.
  Licensed under the BSD 3-Clause license.
  For full license text, see LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/

let questions = [
  { engine: 'tooling', icon: 'fa-medkit', name: 'Health Check score', q: 'SELECT Score FROM SecurityHealthCheck' },
  { engine: 'tooling', icon: 'fa-medkit', name: 'Health Check risks', q: "SELECT RiskType,Setting,SettingGroup,OrgValue,StandardValue FROM SecurityHealthCheckRisks where RiskType in ('HIGH_RISK', 'MEDIUM_RISK')" },
  { icon: 'fa-user-o', name: 'Standard users', q: "select count() from user where isactive=true and usertype='standard'" },
  { icon: 'fa-user-o', name: 'Standard users created last 48h', q: "select id,name,profile.name,createddate from user where isactive=true and usertype='standard' and createddate = last_n_days:2" },
  { icon: 'fa-user-o', name: 'Chatter-only users', q: "select count() from user where isactive=true and usertype='csnonly'" },
  { icon: 'fa-user-o', name: 'Partner-portal users', q: "select count() from user where isactive=true and usertype='PowerPartner'" },
  { icon: 'fa-user-o', name: 'Customer-portal users', q: "select count() from user where isactive=true and (usertype='CustomerSuccess' OR usertype='PowerCustomerSuccess')" },
  { icon: 'fa-user-o', name: 'High-volume users', q: "select count() from user where isactive=true and usertype='CSPLitePortal'" },
  { icon: 'fa-user-o', name: 'Frozen users', q: 'select id,username,name from user where isactive=true and id in (select UserId from UserLogin where isfrozen=true) order by lastmodifieddate desc' },
  { icon: 'fa-user-o', name: 'Users not logged in 90 days', q: 'select count() FROM User where isactive=true and (LastLoginDate<last_n_days:90 OR LastLoginDate=null)' },
  { icon: 'fa-user-o', name: 'Standard users not logged in 90 days', q: "select count() FROM User where isactive=true and usertype='standard' and (LastLoginDate<last_n_days:90 OR LastLoginDate=null)" },
  { icon: 'fa-user', name: 'Users with ViewAllData', q: "select Assignee.Id,Assignee.Username,Assignee.Name,Assignee.Email FROM PermissionSetAssignment WHERE PermissionSet.PermissionsViewAllData = true AND Assignee.IsActive=true AND Assignee.usertype='standard' group by Assignee.Id,Assignee.Username,Assignee.Name,Assignee.Email" },
  { icon: 'fa-user', name: 'Users with ModifyAllData', q: "select Assignee.Id,Assignee.Username,Assignee.Name,Assignee.Email FROM PermissionSetAssignment WHERE PermissionSet.PermissionsModifyAllData = true AND Assignee.IsActive=true AND Assignee.usertype='standard' group by Assignee.Id,Assignee.Username,Assignee.Name,Assignee.Email" },
  { icon: 'fa-user', name: 'Users with ManageUsers', q: "select Assignee.Id,Assignee.Username,Assignee.Name,Assignee.Email FROM PermissionSetAssignment WHERE PermissionSet.PermissionsManageUsers = true AND Assignee.IsActive=true AND Assignee.usertype='standard' group by Assignee.Id,Assignee.Username,Assignee.Name,Assignee.Email" },
  { icon: 'fa-user', name: 'Users with ManageInternalUsers', q: "select Assignee.Id,Assignee.Username,Assignee.Name,Assignee.Email FROM PermissionSetAssignment WHERE PermissionSet.PermissionsManageInternalUsers = true AND Assignee.IsActive=true AND Assignee.usertype='standard' group by Assignee.Id,Assignee.Username,Assignee.Name,Assignee.Email" },
  { icon: 'fa-user', name: 'Users with CustomizeApplication', q: "select Assignee.Id,Assignee.Username,Assignee.Name,Assignee.Email FROM PermissionSetAssignment WHERE PermissionSet.PermissionsCustomizeApplication = true AND Assignee.IsActive=true AND Assignee.usertype='standard' group by Assignee.Id,Assignee.Username,Assignee.Name,Assignee.Email" },
  { icon: 'fa-user', name: 'Users with ApiUserOnly', q: "select Assignee.Id,Assignee.Username,Assignee.Name,Assignee.Email FROM PermissionSetAssignment WHERE PermissionSet.PermissionsApiUserOnly = true AND Assignee.IsActive=true AND Assignee.usertype='standard' group by Assignee.Id,Assignee.Username,Assignee.Name,Assignee.Email" },
  { icon: 'fa-user', name: 'Users with AssignPermissionSets', q: "select Assignee.Id,Assignee.Username,Assignee.Name,Assignee.Email FROM PermissionSetAssignment WHERE PermissionSet.PermissionsAssignPermissionSets = true AND Assignee.IsActive=true AND Assignee.usertype='standard' group by Assignee.Id,Assignee.Username,Assignee.Name,Assignee.Email" },
  { icon: 'fa-user', name: 'Users with ManageIpAddresses', q: "select Assignee.Id,Assignee.Username,Assignee.Name,Assignee.Email FROM PermissionSetAssignment WHERE PermissionSet.PermissionsManageIpAddresses = true AND Assignee.IsActive=true AND Assignee.usertype='standard' group by Assignee.Id,Assignee.Username,Assignee.Name,Assignee.Email" },
  { icon: 'fa-user', name: 'Users with ManagePasswordPolicies', q: "select Assignee.Id,Assignee.Username,Assignee.Name,Assignee.Email FROM PermissionSetAssignment WHERE PermissionSet.PermissionsManagePasswordPolicies = true AND Assignee.IsActive=true AND Assignee.usertype='standard' group by Assignee.Id,Assignee.Username,Assignee.Name,Assignee.Email" },
  { icon: 'fa-user', name: 'Users with ManageSharing', q: "select Assignee.Id,Assignee.Username,Assignee.Name,Assignee.Email FROM PermissionSetAssignment WHERE PermissionSet.PermissionsManageSharing = true AND Assignee.IsActive=true AND Assignee.usertype='standard' group by Assignee.Id,Assignee.Username,Assignee.Name,Assignee.Email" },
  { icon: 'fa-user', name: 'Users with ManageRoles', q: "select Assignee.Id,Assignee.Username,Assignee.Name,Assignee.Email FROM PermissionSetAssignment WHERE PermissionSet.PermissionsManageRoles = true AND Assignee.IsActive=true AND Assignee.usertype='standard' group by Assignee.Id,Assignee.Username,Assignee.Name,Assignee.Email" },
  { icon: 'fa-user', name: 'Users with ManageProfilesPermissionsets', q: "select Assignee.Id,Assignee.Username,Assignee.Name,Assignee.Email FROM PermissionSetAssignment WHERE PermissionSet.PermissionsManageProfilesPermissionsets = true AND Assignee.IsActive=true AND Assignee.usertype='standard' group by Assignee.Id,Assignee.Username,Assignee.Name,Assignee.Email" },
  { icon: 'fa-user', name: 'Users with ResetPasswords', q: "select Assignee.Id,Assignee.Username,Assignee.Name,Assignee.Email FROM PermissionSetAssignment WHERE PermissionSet.PermissionsResetPasswords = true AND Assignee.IsActive=true AND Assignee.usertype='standard' group by Assignee.Id,Assignee.Username,Assignee.Name,Assignee.Email" },
  { icon: 'fa-user', name: 'Users with AuthorApex', q: "select Assignee.Id,Assignee.Username,Assignee.Name,Assignee.Email FROM PermissionSetAssignment WHERE PermissionSet.PermissionsAuthorApex = true AND Assignee.IsActive=true AND Assignee.usertype='standard' group by Assignee.Id,Assignee.Username,Assignee.Name,Assignee.Email" },
  { icon: 'fa-user', name: 'Users with PasswordNeverExpires', q: "select Assignee.Id,Assignee.Username,Assignee.Name,Assignee.Email FROM PermissionSetAssignment WHERE PermissionSet.PermissionsPasswordNeverExpires = true AND Assignee.IsActive=true AND Assignee.usertype='standard' group by Assignee.Id,Assignee.Username,Assignee.Name,Assignee.Email" },
  { icon: 'fa-user', name: 'Users without corporate email', q: `select Id,Username,Name,Email from user where isactive=true and usertype='standard' and (NOT (email like '%@%${process.env.CORP_DOMAIN}'))` },
  { icon: 'fa-sitemap', name: 'Internal roles', q: "select count() from UserRole where portaltype='none'" },
  { icon: 'fa-sitemap', name: 'Unassigned Internal roles', q: "select count() from UserRole where portaltype='none' and id not in (select userroleid from user)" },
  { icon: 'fa-sitemap', name: 'Customer-portal roles', q: "select count() from userrole where PortalType='CustomerPortal'" },
  { icon: 'fa-sitemap', name: 'Partner-portal roles', q: "select count() from userrole where PortalType='Partner'" },
  { icon: 'fa-shield', name: 'Login IP ranges', q: 'SELECT ProfileId,IpStartAddress,IpEndAddress FROM LoginIpRange' },
  { icon: 'fa-shield', name: 'Profiles', q: 'select count() from Profile' },
  { icon: 'fa-shield', name: 'Used Profiles without IP ranges', q: 'select Id,Name from profile where id not in (select ProfileId FROM LoginIpRange) and id in (select profileid from user)' },
  { icon: 'fa-shield', name: 'Unused custom Profiles', q: 'SELECT Profile.Name,ProfileId FROM PermissionSet where IsCustom=true and IsOwnedByProfile=true and ProfileId not in (select profileid from user)' },
  { icon: 'fa-shield', name: 'PermissionSets', q: 'select count() from PermissionSet WHERE IsOwnedByProfile = false' },
  { icon: 'fa-code', name: 'VF pages', q: 'select count() from apexpage' },
  { icon: 'fa-code', name: 'VF components', q: 'select count() from apexcomponent' },
  { icon: 'fa-code', name: 'Apex classes', q: 'select count() from apexclass' },
  { icon: 'fa-code', name: 'Apex triggers', q: 'select count() from apextrigger' },
  { engine: 'tooling', icon: 'fa-code', name: 'Remote Site Settings', q: 'select SiteName,EndpointUrl,ProtocolMismatch from remoteproxy where IsActive=true' },
  { engine: 'tooling', icon: 'fa-code', name: 'sObjects', q: 'select MasterLabel,QualifiedApiName,NewUrl from entitydefinition where IsCustomizable=true and IsFlsEnabled=true' }
]

module.exports = questions
