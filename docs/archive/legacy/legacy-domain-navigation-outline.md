Domain หลัก (Top nav) 
Sub Domain (side bar):
            component: "G:\covibe\UI Components\Modern Glass Sidebar"
Domain A [parent]
 - Project Overview (frist item on top bar) 
   side bar [child]
                     |       icon      | breadcump >
    ----------------------------------------------------------------------------------------------------------
                     |      logo       | CoDev > Project name     |     Domain A       |     Domain B        |   
                     |       1         |     sub-text             |     (parent)       |     (parent)        |
    -----------------|-----<close>-----|>-----<expand>------------|--------------------|---------------------|
      | sub-domainA  |  [ icon - A1 ]  |>   Dashboard      |
      |   (child)    |  [ icon - A2 ]  |>   Manager        |
                     |  [ icon - A3 ]  |>   Plugins        |
                     |  [ icon - A4 ]  |>   Agent          |
                     | [icon-bottom2]  |>   Settings       |
                     | [icon-bottom1]  |>   expand,close   |                 |
                     |                 |                 |
                     

  A1 : Dashboard 
    icon : pie-chart
  A2 : Manager Board
    icon : manager
  A3 : Plugins
    icon : plug-in
  A4 : Agent
    icon : agent

  Bottom-menu 
     A5 : 
        icon : settings
     A6 :
        icon : expand,close
  
---

Domain B [parent]
 - Genesis Knowledge System (second item on top bar) 
     
 Sub-domain  (side bar) [child]

 B1 : Code Structure 
    icon : trees-outline
 B2 : Business Logic 
    icon : 
 B3 : Codebase Graph
    icon : globe-model
    feature :  view and build node like n8n
     - AST 
     - call graph 
     - Data flow graph
     - Control flow graph
     - Dependency graph
     - Class, function, method call graph
     - High level abstract tree of architecture

Domain C [parent]
 - Genesis Block DB (third item on top bar) 
 sub domain
 C1 : Obsidian view
     icon : 
     feature :  view and query atomic knowledge
     - atomic notes
C2 : vector store HNSW
    icon :
    C3 : GraphRAG
 

     
 
 
