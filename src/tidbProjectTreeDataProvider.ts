import * as vscode from 'vscode';
import * as ti from 'tidbcloud-sdk';
import * as path from "path";


class ProjectNode extends vscode.TreeItem {
    id: string;
    orgId: string;
    name: string;
    clusterCount: number;
    public children: ClusterNode[] | undefined;
    constructor(id: string, orgId: string, name: string, clusterCount: number, lable: string, children?: ClusterNode[]) {
        super(lable, children === undefined ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Expanded);
        this.children = children;
        this.label = name;
        this.clusterCount = clusterCount;
        this.name = name;
        this.orgId = orgId;
        this.id = id;
    }
    
}

class ClusterNode extends vscode.TreeItem {
    id: string;
    projectId: string;
    name: string;
    clusterType: string;
    cloudProvider: string;
    region: string;
    clusterStatus: string;
    username: string;
    host: string;
    port: number;
    constructor(id:string, projectId: string, name: string, clusterType: string, cloudProvider:string, region:string, clusterStatus:string, username:string, host:string, port: number, lable: string) {
        super(lable, vscode.TreeItemCollapsibleState.None);
        this.label = this.name;
        this.id = id;
        this.projectId = projectId;
        this.name = name;
        this.clusterType = clusterType;
        this.cloudProvider = cloudProvider;
        this.username = username;
        this.host = host;
        this.port = port;
    }
}

export class TidbCloudDataProvider implements vscode.TreeDataProvider<any> {
    private _onDidChangeTreeData: vscode.EventEmitter<ProjectNode | null> = new vscode.EventEmitter<ProjectNode | null>();
	readonly onDidChangeTreeData: vscode.Event<ProjectNode | null> = this._onDidChangeTreeData.event;
    projects: ProjectNode[] = [];
    username:string = process.env.TIDB_CLOUD_USERNAME as string;
    password:string = process.env.TIDB_CLOUD_PASSWORD as string;
    private autoRefresh: boolean = true;
    constructor(private context: vscode.ExtensionContext) {
        this.autoRefresh = vscode.workspace.getConfiguration('taskOutline').get('autorefresh');
    }
    public getTreeItem(element: ProjectNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
        
        return element;

    }
    public async getChildren(element?: ProjectNode):Promise<ProjectNode[]> {
        if (!element)
        {
            await this.listAllProjects(this.username,this.password).then(function (value) {
                return value;
            });
            return this.projects;
        }
        //element.children;
    }

    async listAllProjects(username: string, password: string) {
        var projectApi = new ti.ProjectApi(username,password);
        var apiResponse = await projectApi.listProjects(1,10);
        var projectIds = apiResponse.body.items.map(project => project.id!);
        var orgIds = apiResponse.body.items.map(project => project.orgId!);
        var names = apiResponse.body.items.map(project => project.name!);
        var clusterCounts = apiResponse.body.items.map(project => project.clusterCount!);

        for (var i=0; i<apiResponse.body.total; i++)
        {
            var clusterApi = new ti.ClusterApi(username,password);
            var clusterApiResponse = await clusterApi.listClustersOfProject(projectIds[i],1,10);
            var clusters: ClusterNode[] = [];
            var clusterIds = clusterApiResponse.body.items.map(cluster => cluster.id);
            var clusterNames = clusterApiResponse.body.items.map(cluster => cluster.name);
            var clusterTypes = clusterApiResponse.body.items.map(cluster => cluster.clusterType);
            var cloudProviders = clusterApiResponse.body.items.map(cluster => cluster.cloudProvider);
            var regions = clusterApiResponse.body.items.map(cluster => cluster.region);
            var clusterStatuses = clusterApiResponse.body.items.map(cluster => cluster.status.clusterStatus);
            var usernames = clusterApiResponse.body.items.map(cluster => cluster.status.connectionStrings.defaultUser);
            var host = clusterApiResponse.body.items.map(cluster => cluster.status.connectionStrings.standard.host);
            var port = clusterApiResponse.body.items.map(cluster => cluster.status.connectionStrings.standard.port);
            for (var j=0; j<clusterApiResponse.body.total; j++)
            {
                clusters.push(new ClusterNode(clusterIds[j],projectIds[i],clusterNames[j],String(clusterTypes[j]),String(cloudProviders[j]),regions[j],String(clusterStatuses[j]),usernames[j],host[j],port[j],clusterNames[j]));
            }
            this.projects.push(new ProjectNode(projectIds[i],orgIds[i],names[i],clusterCounts[i], projectIds[i],clusters));
        }
    }
}